// 全局狀態管理
const state = {
  isInitialized: false,
  isExtensionValid: false,
  initRetryCount: 0,
  currentUrl: window.location.href,
  elements: {
    dividers: [],
    blocks: [],
    notes: [],
    highlights: [] // 新增: 存儲螢光筆標記
  },
  highlighter: {
    isActive: false,
    color: '#ffff00',  // 預設黃色
    history: []        // 新增: 歷史記錄用於撤銷操作
  }
};

const config = {
  MAX_RETRIES: 5,
  RETRY_DELAY: 1000,
  STORAGE_PREFIX: 'focuscut_',
  EXTENSION_CHECK_INTERVAL: 500
};

// 遮色片功能 - 修改為上下兩片
let readingMaskTop = null;
let readingMaskBottom = null;
let readingMaskControls = null;
let isMaskActive = false;
let topMaskHeight = window.innerHeight * 0.3; // 初始上方遮色片高度，佔螢幕30%
let bottomMaskHeight = window.innerHeight * 0.3; // 初始下方遮色片高度，佔螢幕30%

function toggleReadingMask(maskStyle) {
  if (isMaskActive) {
    removeReadingMask();
  } else {
    // 使用指定的樣式，如果未指定則使用預設樣式
    const style = maskStyle || {
      style: 'white-blur',
      color: 'rgba(245, 245, 245, 0.4)' // #F5F5F5 with opacity 0.4
    };
    createMaskWithStyle(style);
  }
}

function createMaskWithStyle(maskStyle) {
  // 先檢查是否已經存在遮色片，避免重複創建
  if (document.querySelector('.focuscut-reading-mask-top') || 
      document.querySelector('.focuscut-reading-mask-bottom')) {
    console.log('FocusCut: Reading mask already exists, removing first');
    removeReadingMask();
  }

  console.log('FocusCut: Creating reading mask with style:', maskStyle);

  try {
    // 創建上方遮色片
    readingMaskTop = document.createElement('div');
    readingMaskTop.className = 'focuscut-reading-mask-top';
    readingMaskTop.style.height = topMaskHeight + 'px'; // 使用變量
    readingMaskTop.style.backgroundColor = maskStyle.color; // 使用選定的顏色
    readingMaskTop.style.backdropFilter = 'blur(4px)'; // 模糊背景，更聚焦
    readingMaskTop.style.WebkitBackdropFilter = 'blur(4px)'; // Safari 支持
    
    // 添加上方遮色片的下邊框調整區
    const topEdge = document.createElement('div');
    topEdge.className = 'focuscut-reading-mask-edge focuscut-reading-mask-edge-bottom';
    topEdge.title = chrome.i18n.getMessage('dragToAdjustMask') || '拖曳調整遮色片高度';
    topEdge.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      initMaskResize(e, true);
    });
    readingMaskTop.appendChild(topEdge);
    
    // 創建下方遮色片
    readingMaskBottom = document.createElement('div');
    readingMaskBottom.className = 'focuscut-reading-mask-bottom';
    readingMaskBottom.style.height = bottomMaskHeight + 'px'; // 使用變量
    readingMaskBottom.style.backgroundColor = maskStyle.color; // 使用選定的顏色
    readingMaskBottom.style.backdropFilter = 'blur(4px)'; // 模糊背景，更聚焦
    readingMaskBottom.style.WebkitBackdropFilter = 'blur(4px)'; // Safari 支持
    
    // 添加下方遮色片的上邊框調整區
    const bottomEdge = document.createElement('div');
    bottomEdge.className = 'focuscut-reading-mask-edge focuscut-reading-mask-edge-top';
    bottomEdge.title = chrome.i18n.getMessage('dragToAdjustMask') || '拖曳調整遮色片高度';
    bottomEdge.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      initMaskResize(e, false);
    });
    readingMaskBottom.appendChild(bottomEdge);
    
    // 創建控制按鈕
    readingMaskControls = document.createElement('div');
    readingMaskControls.className = 'focuscut-reading-mask-controls';
    
    // 僅保留關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.className = 'focuscut-close-button';
    closeButton.title = chrome.i18n.getMessage('closeReadingMask') || '關閉遮色片';
    
    // 創建關閉圖示
    const closeIcon = document.createElement('span');
    closeIcon.className = 'focuscut-close-icon';
    closeButton.appendChild(closeIcon);
    
    closeButton.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('FocusCut: Closing reading mask');
      removeReadingMask();
    });
    
    readingMaskControls.appendChild(closeButton);
    
    // 添加到頁面
    document.body.appendChild(readingMaskTop);
    document.body.appendChild(readingMaskBottom);
    document.body.appendChild(readingMaskControls);
    
    console.log('FocusCut: Mask elements added to the DOM');
    
    // 只添加滾動和調整視窗大小的事件
    window.addEventListener('scroll', positionMasks);
    window.addEventListener('resize', handleResize);
    
    isMaskActive = true;
  } catch (error) {
    console.error('FocusCut: Error creating reading mask:', error);
  }
}

// 處理窗口大小變化
function handleResize() {
  // 保持遮色片的相對比例
  const viewportHeight = window.innerHeight;
  const topRatio = topMaskHeight / viewportHeight;
  const bottomRatio = bottomMaskHeight / viewportHeight;
  
  topMaskHeight = viewportHeight * topRatio;
  bottomMaskHeight = viewportHeight * bottomRatio;
  
  positionMasks();
}

function positionMasks() {
  if (!readingMaskTop || !readingMaskBottom) {
    console.error('FocusCut: Mask elements not found');
    return;
  }
  
  // 直接設置高度
  readingMaskTop.style.height = topMaskHeight + 'px';
  readingMaskBottom.style.height = bottomMaskHeight + 'px';
}

function removeReadingMask() {
  if (readingMaskTop) {
    document.body.removeChild(readingMaskTop);
    readingMaskTop = null;
  }
  
  if (readingMaskBottom) {
    document.body.removeChild(readingMaskBottom);
    readingMaskBottom = null;
  }
  
  if (readingMaskControls) {
    document.body.removeChild(readingMaskControls);
    readingMaskControls = null;
  }
  
  window.removeEventListener('scroll', positionMasks);
  window.removeEventListener('resize', handleResize);
  
  isMaskActive = false;
}

// 通知背景腳本，內容腳本已載入，並啟動初始化
try {
  chrome.runtime.sendMessage({ action: 'contentScriptLoaded', url: window.location.href });
  
  // 只在這裡調用一次初始化函數
  setTimeout(() => {
    initializeExtension();
  }, 100);
} catch (error) {
  console.warn('FocusCut: Failed to send initial message:', error);
  // 即使發送初始消息失敗，仍然嘗試初始化
  setTimeout(() => {
    initializeExtension();
  }, 100);
}

// 安全的 Chrome API 調用包裝器
async function safeChromeCall(operation) {
  return new Promise((resolve) => {
    // 檢查擴展上下文
    if (!chrome?.runtime?.id) {
      // 不記錄任何錯誤
      resolve(null);
      return;
    }

    // 檢查 storage API
    if (!chrome?.storage?.local) {
      // 不記錄任何錯誤
      resolve(null);
      return;
    }

    try {
      operation((result) => {
        if (chrome.runtime.lastError) {
          // 不記錄 Chrome 錯誤
          resolve(null);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      // 不記錄操作錯誤
      resolve(null);
    }
  });
}

// 添加全局樣式
function addGlobalStyles() {
  // 檢查是否已經添加了樣式
  if (document.getElementById('focuscut-global-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'focuscut-global-styles';
  
  style.textContent = `
    .focuscut-highlighter-pen, .focuscut-pen-tool {
      border-radius: 50%;
      transition: all 0.2s ease;
    }
    
    .focuscut-highlighter-pen:hover, .focuscut-pen-tool:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .focuscut-highlighter-pen.active, .focuscut-pen-tool.active {
      background-color: rgba(0, 0, 0, 0.2);
      box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    }
    
    .focuscut-highlighter {
      position: absolute;
      pointer-events: auto;
      border-radius: 2px;
      z-index: 9999;
    }
    
    #focuscut-pen-box {
      transition: opacity 0.3s ease;
      opacity: 0.85;
    }
    
    #focuscut-pen-box:hover {
      opacity: 1;
    }
    
    .focuscut-eraser-dragging .focuscut-highlighter:hover {
      opacity: 0.5;
      box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.3);
    }
  `;
  
  document.head.appendChild(style);
  
  // 添加鍵盤事件監聽器處理撤銷操作
  setupKeyboardShortcuts();
}

// 設置鍵盤快捷鍵
function setupKeyboardShortcuts() {
  // 追蹤是否已按下 Ctrl+A 或 Command+A
  let isSelectAllActive = false;
  
  document.addEventListener('keydown', function(e) {
    // 檢測 Ctrl+Z 或 Command+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      // 在文本輸入框中不攔截撤銷操作
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      // 阻止默認撤銷行為
      e.preventDefault();
      
      // 執行我們的撤銷操作
      undoHighlighterAction();
      return;
    }
    
    // 檢測 Ctrl+A 或 Command+A
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      // 在文本輸入框中不攔截全選操作
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      // 設置已按下全選
      isSelectAllActive = true;
      console.log('FocusCut: Ctrl+A/Command+A pressed');
      
      // 使用計時器在短時間內重置狀態，以便只在連續操作時有效
      setTimeout(() => {
        if (isSelectAllActive) {
          isSelectAllActive = false;
          console.log('FocusCut: Ctrl+A/Command+A expired');
        }
      }, 800); // 800毫秒的窗口期
    }
    
    // 檢測 Backspace 鍵
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // 在文本輸入框中不攔截刪除操作
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      
      // 如果之前按下了 Ctrl+A 或 Command+A
      if (isSelectAllActive) {
        // 阻止默認刪除行為
        e.preventDefault();
        
        // 重置狀態
        isSelectAllActive = false;
        console.log('FocusCut: Backspace pressed after Ctrl+A/Command+A');
        
        // 執行清除所有高亮的操作
        clearAllHighlights();
      }
    }
  });
  
  // 點擊頁面時也重置全選狀態
  document.addEventListener('click', function() {
    if (isSelectAllActive) {
      isSelectAllActive = false;
      console.log('FocusCut: Ctrl+A/Command+A reset due to click');
    }
  });
}

// 初始化檢查和重試機制
async function initializeExtension() {
  console.log('FocusCut: Starting initialization...');
  
  try {
    // 檢查擴展上下文
    state.isExtensionValid = await checkExtensionContext();

    if (!state.isExtensionValid) {
      if (state.initRetryCount < config.MAX_RETRIES) {
        console.log(`FocusCut: Retrying initialization (${state.initRetryCount + 1}/${config.MAX_RETRIES})`);
        state.initRetryCount++;
        setTimeout(initializeExtension, config.RETRY_DELAY);
        return;
      }
      // 在達到最大重試次數後，只使用 localStorage，不顯示錯誤
    }
    
    // 添加全局樣式
    addGlobalStyles();
    
    await setupEventListeners();
    await loadSavedElements();
    state.isInitialized = true;
    console.log('FocusCut: Initialization completed');
  } catch (error) {
    // 不記錄初始化錯誤
    state.isExtensionValid = false;
    
    try {
      // 靜默回退到僅使用 localStorage
      await loadSavedElements();
    } catch (retryError) {
      // 不記錄重試錯誤
      resetElements();
    }
  }
  
  // 添加筆盒到頁面
  createHighlighterPenBox();
}

// 檢查擴展上下文
async function checkExtensionContext() {
  try {
    const result = await safeChromeCall((callback) => {
      callback(true);
    });
    return result !== null;
  } catch (error) {
    return false;
  }
}

// 設置事件監聽器
async function setupEventListeners() {
  // 移除現有的監聽器
  chrome.runtime.onMessage.removeListener(handleMessage);
  
  // 添加新的監聽器
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 監聽頁面變化
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('popstate', handlePopState);
  
  // 設置 URL 變化檢查
  setInterval(checkUrlChange, 500);
}

// 消息處理
function handleMessage(request, sender, sendResponse) {
  try {
    // 檢查message的合法性
    if (!request || typeof request !== 'object') {
      console.warn('FocusCut: Received invalid message');
    return;
  }
  
    console.log('FocusCut: Content script received message:', request.action);
    
    // 處理各種指令
    switch(request.action) {
        case 'addDivider':
        addDivider(request.color);
          break;
      
        case 'addBlock':
        addBlock(request.color);
          break;
      
        case 'addNote':
        addNote(request.color);
          break;
      
      case 'clearAll':
        clearAllElements();
          break;
      
      case 'rescan':
        initializeExtension();
        break;
      
        case 'enableHighlighter':
          enableHighlighter(request.color);
          break;
      
      case 'toggleReadingMask':
        if (!isMaskActive) {
          // 創建遮色片時應用選定樣式
          createMaskWithStyle(request.maskStyle);
        } else {
          removeReadingMask();
        }
        break;
    }
    
    if (sendResponse) {
      sendResponse({ status: 'success' });
      }
    } catch (error) {
      console.error('FocusCut: Error handling message:', error);
    if (sendResponse) {
      sendResponse({ status: 'error', message: error.message });
    }
  }
}

// 存儲操作
async function saveElements() {
  if (!state.isInitialized) {
    return;
  }
  
  const pageKey = getCurrentPageKey();
  const data = state.elements;
  
  // 首先保存到 localStorage (主要存儲)
  try {
    localStorage.setItem(`${config.STORAGE_PREFIX}${pageKey}`, JSON.stringify(data));
    console.log('FocusCut: Saved to localStorage');
  } catch (error) {
    console.error('FocusCut: Failed to save to localStorage:', error);
  }
  
  // 嘗試備份到 Chrome storage (靜默操作)
  if (state.isExtensionValid && chrome?.runtime?.id) {
    try {
      chrome.storage.local.set({ [pageKey]: data }, () => {
        // 成功時靜默處理，無需顯示消息
        if (!chrome.runtime.lastError) {
          // 成功但不記錄
        } else {
          // 失敗但也不記錄錯誤
          state.isExtensionValid = false;
        }
      });
    } catch (error) {
      // 不記錄任何錯誤
      state.isExtensionValid = false;
    }
  }
}

// 載入元素
async function loadSavedElements() {
  const pageKey = getCurrentPageKey();
  let data = null;
  
  // 首先嘗試從 localStorage 載入
  try {
    const localData = localStorage.getItem(`${config.STORAGE_PREFIX}${pageKey}`);
    if (localData) {
      data = JSON.parse(localData);
      console.log('FocusCut: Loaded from localStorage');
    }
  } catch (error) {
    console.warn('FocusCut: Failed to load from localStorage:', error);
  }

  // 如果 localStorage 中沒有數據且擴展有效，嘗試從 Chrome storage 載入
  if (!data && state.isExtensionValid && chrome?.runtime?.id) {
    try {
      // 使用原生的 chrome.storage.local.get 而非 safeChromeCall
      chrome.storage.local.get([pageKey], (storageData) => {
        if (!chrome.runtime.lastError && storageData && storageData[pageKey]) {
          // 成功獲取數據
          data = storageData[pageKey];
          
          // 設置到全局狀態
          state.elements = {
            dividers: Array.isArray(data.dividers) ? data.dividers : [],
            blocks: Array.isArray(data.blocks) ? data.blocks : [],
            notes: Array.isArray(data.notes) ? data.notes : [],
            highlights: Array.isArray(data.highlights) ? data.highlights : []
          };
          
          // 顯示成功訊息
          console.log('FocusCut: Loaded from Chrome storage');
          
          // 同步到 localStorage (靜默操作)
          try {
            localStorage.setItem(`${config.STORAGE_PREFIX}${pageKey}`, JSON.stringify(data));
          } catch (localStorageError) {
            // 不記錄錯誤
          }
          
          // 創建元素
          createElementsFromData(state.elements);
        } else {
          // Chrome storage 不可用，只使用 localStorage
          state.isExtensionValid = false;
          createElementsFromLocalData(pageKey);
        }
      });
    } catch (error) {
      // 不記錄錯誤
      state.isExtensionValid = false;
      createElementsFromLocalData(pageKey);
    }
  } else {
    // 直接從已經加載的 localStorage 數據創建元素
    if (data) {
      state.elements = {
        dividers: Array.isArray(data.dividers) ? data.dividers : [],
        blocks: Array.isArray(data.blocks) ? data.blocks : [],
        notes: Array.isArray(data.notes) ? data.notes : [],
        highlights: Array.isArray(data.highlights) ? data.highlights : []
      };
      createElementsFromData(state.elements);
    } else {
      console.log('FocusCut: No saved elements found');
      resetElements();
    }
  }
}

// 從本地存儲中加載數據並創建元素
async function createElementsFromLocalData(pageKey) {
  try {
    const localData = localStorage.getItem(`${config.STORAGE_PREFIX}${pageKey}`);
    if (localData) {
      const data = JSON.parse(localData);
      state.elements = {
        dividers: Array.isArray(data.dividers) ? data.dividers : [],
        blocks: Array.isArray(data.blocks) ? data.blocks : [],
        notes: Array.isArray(data.notes) ? data.notes : [],
        highlights: Array.isArray(data.highlights) ? data.highlights : []
      };
      createElementsFromData(state.elements);
    } else {
      console.log('FocusCut: No saved elements found');
      resetElements();
    }
  } catch (error) {
    console.error('FocusCut: Error loading from localStorage:', error);
    resetElements();
  }
}

// 從數據創建元素
async function createElementsFromData(elementsData) {
  try {
    // 清除現有元素
    await clearAllElements();
    
    // 創建分隔線
    if (elementsData.dividers.length > 0) {
      for (let i = 0; i < elementsData.dividers.length; i++) {
        try {
          createDivider(elementsData.dividers[i]);
        } catch (dividerError) {
          console.error('FocusCut: Error creating divider:', dividerError);
        }
      }
    }
    
    // 創建色卡
    if (elementsData.blocks.length > 0) {
      for (let i = 0; i < elementsData.blocks.length; i++) {
        try {
          createBlock(elementsData.blocks[i]);
        } catch (blockError) {
          console.error('FocusCut: Error creating block:', blockError);
        }
      }
    }
    
    // 創建便利貼
    if (elementsData.notes.length > 0) {
      for (let i = 0; i < elementsData.notes.length; i++) {
        try {
          createNote(elementsData.notes[i]);
        } catch (noteError) {
          console.error('FocusCut: Error creating note:', noteError);
        }
      }
    }
    
    // 新增: 創建高亮標記
    if (elementsData.highlights && elementsData.highlights.length > 0) {
      try {
        restoreHighlights(elementsData.highlights);
      } catch (highlightError) {
        console.error('FocusCut: Error creating highlights:', highlightError);
      }
    }
    
    console.log('FocusCut: Successfully created elements');
  } catch (error) {
    console.error('FocusCut: Error creating elements:', error);
    resetElements();
  }
}

// 重置元素
function resetElements() {
  state.elements = {
    dividers: [],
    blocks: [],
    notes: [],
    highlights: [] // 新增: 重置高亮
  };
}

// URL 變化處理
async function handleUrlChange(newUrl = window.location.href) {
  if (state.currentUrl === newUrl) return;
  
  console.log('FocusCut: URL changed from', state.currentUrl, 'to', newUrl);
  state.currentUrl = newUrl;
  
  try {
    await clearAllElements();
    resetElements();
    
    if (state.isInitialized) {
      await loadSavedElements();
    }
  } catch (error) {
    console.error('FocusCut: Error handling URL change:', error);
  }
}

// 事件處理函數
function handleBeforeUnload() {
  if (state.isInitialized) {
    saveElements();
  }
}

function handlePopState() {
  handleUrlChange();
}

function checkUrlChange() {
  handleUrlChange();
}

// 獲取當前頁面的唯一標識符
function getCurrentPageKey() {
  return state.currentUrl;
}

// 啟動初始化
initializeExtension();

// 清除頁面上的所有元素
function clearAllElements() {
  return new Promise((resolve) => {
    const focuscutElements = document.querySelectorAll('.focuscut-divider, .focuscut-block, .focuscut-sticky-note, .focuscut-highlighter');
    console.log('FocusCut: Clearing', focuscutElements.length, 'existing elements');
    
    focuscutElements.forEach(el => {
      el.remove();
    });
    
    // 確保DOM操作有時間完成
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

// Base64 編碼字符串，安全地儲存URL
function safeEncodeURL(url) {
  // 直接使用encodeURIComponent來處理URL，避免特殊字符問題
  return encodeURIComponent(url);
}

// 創建分隔線
function createDivider(dividerData) {
  return new Promise((resolve) => {
    const divider = document.createElement('div');
    divider.className = 'focuscut-divider';
    divider.style.backgroundColor = dividerData.color;
    divider.style.position = 'absolute';
    divider.style.left = dividerData.position.x + 'px';
    divider.style.top = dividerData.position.y + 'px';
    divider.style.width = (dividerData.width || '100%');
    divider.style.zIndex = '9999';
    
    const deleteButton = document.createElement('div');
    deleteButton.className = 'focuscut-delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      divider.remove();
      state.elements.dividers = state.elements.dividers.filter(d => d !== dividerData);
      saveElements();
    });
    divider.appendChild(deleteButton);
    
    const resizer = document.createElement('div');
    resizer.className = 'focuscut-resizer';
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      initResize(e, divider, dividerData, 'width');
    });
    divider.appendChild(resizer);
    
    makeDraggable(divider, dividerData);
    
    document.body.appendChild(divider);
    resolve(divider);
  });
}

// 創建色卡
function createBlock(blockData) {
  return new Promise((resolve) => {
    const block = document.createElement('div');
    block.className = 'focuscut-block';
    
    const color = blockData.color || '#ff6b6b';
    const rgbaColor = convertToRGBA(color, 0.15);
    block.style.backgroundColor = rgbaColor;
    
    // 設置初始樣式和位置
    block.style.position = blockData.fixed ? 'fixed' : 'absolute';
    block.style.left = blockData.position.x + 'px';
    block.style.top = blockData.position.y + 'px';
    block.style.width = (blockData.size.width || 200) + 'px';
    block.style.height = (blockData.size.height || 100) + 'px';
    block.style.zIndex = '9998';
    
    // 如果是固定狀態，添加自定義屬性
    if (blockData.fixed) {
      block.setAttribute('data-fixed', 'true');
    }
    
    // 添加刪除按鈕
    const deleteButton = document.createElement('div');
    deleteButton.className = 'focuscut-delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      block.remove();
      state.elements.blocks = state.elements.blocks.filter(b => b !== blockData);
      saveElements();
    });
    block.appendChild(deleteButton);
    
    // 添加鎖定/解鎖按鈕 (圓形樣式)
    const lockButton = document.createElement('div');
    lockButton.className = 'focuscut-lock-button';
    
    // 創建鎖圖標
    const lockIcon = document.createElement('div');
    lockIcon.className = 'lock-icon';
    lockButton.appendChild(lockIcon);
    
    lockButton.title = blockData.fixed ? 
      chrome.i18n.getMessage('unlockPosition') || '取消固定 (目前已固定在螢幕上)' : 
      chrome.i18n.getMessage('lockPosition') || '固定在螢幕上 (目前會跟隨頁面滾動)';
    
    // 如果是固定狀態，添加自定義屬性
    if (blockData.fixed) {
      lockButton.setAttribute('data-locked', 'true');
    }
    
    lockButton.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 切換鎖定狀態
      blockData.fixed = !blockData.fixed;
      
      // 更新鎖定按鈕狀態
      if (blockData.fixed) {
        lockButton.setAttribute('data-locked', 'true');
        block.setAttribute('data-fixed', 'true');
      } else {
        lockButton.removeAttribute('data-locked');
        block.removeAttribute('data-fixed');
      }
      
      // 更新提示文字
      lockButton.title = blockData.fixed ? 
        chrome.i18n.getMessage('unlockPosition') || '取消固定 (目前已固定在螢幕上)' : 
        chrome.i18n.getMessage('lockPosition') || '固定在螢幕上 (目前會跟隨頁面滾動)';
      
      // 保存當前滾動位置
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      // 計算絕對位置和相對視窗的固定位置之間的轉換
      const rect = block.getBoundingClientRect();
      
      if (blockData.fixed) {
        // 從絕對位置轉換為固定位置
        block.style.position = 'fixed';
        blockData.position.x = rect.left;
        blockData.position.y = rect.top;
      } else {
        // 從固定位置轉換為絕對位置
        block.style.position = 'absolute';
        blockData.position.x = rect.left + scrollX;
        blockData.position.y = rect.top + scrollY;
      }
      
      // 更新元素位置
      block.style.left = blockData.position.x + 'px';
      block.style.top = blockData.position.y + 'px';
      
      // 保存更改
      saveElements();
    });
    block.appendChild(lockButton);
    
    // 添加大小調整控制點
    const resizer = document.createElement('div');
    resizer.className = 'focuscut-resizer focuscut-resizer-both';
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      initResize(e, block, blockData, 'both');
    });
    block.appendChild(resizer);
    
    // 使元素可拖動
    makeDraggable(block, blockData);
    
    document.body.appendChild(block);
    resolve(block);
  });
}

// 轉換顏色格式為 RGBA
function convertToRGBA(color, alpha) {
  if (color.startsWith('rgba')) {
    return color;
  }
  
  let r, g, b;
  
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (matches) {
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    }
  }
  
  if (r !== undefined && g !== undefined && b !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  return `rgba(255, 107, 107, ${alpha})`;
}

// 初始化大小調整
function initResize(e, element, data, type) {
  e.preventDefault();
  e.stopPropagation();
  
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = parseInt(getComputedStyle(element).width, 10);
  const startHeight = parseInt(getComputedStyle(element).height, 10);
  
  function doDrag(e) {
    if (type === 'width' || type === 'both') {
      const newWidth = startWidth + e.clientX - startX;
      if (newWidth > 50) {
        element.style.width = newWidth + 'px';
        if (data.size) {
          data.size.width = newWidth;
        } else if (typeof data.width !== 'undefined') {
          data.width = newWidth + 'px';
        }
      }
    }
    
    if (type === 'height' || type === 'both') {
      const newHeight = startHeight + e.clientY - startY;
      if (newHeight > 30) {
        element.style.height = newHeight + 'px';
        if (data.size) {
          data.size.height = newHeight;
        }
      }
    }
  }
  
  function stopDrag() {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    saveElements();
  }
  
  document.addEventListener('mousemove', doDrag, false);
  document.addEventListener('mouseup', stopDrag, false);
}

// 創建便利貼
function createNote(noteData) {
  return new Promise((resolve) => {
    const note = document.createElement('div');
    note.className = 'focuscut-sticky-note';
    note.style.position = 'absolute';
    note.style.left = noteData.position.x + 'px';
    note.style.top = noteData.position.y + 'px';
    note.style.width = (noteData.width || '250px');
    note.style.height = (noteData.height || 'auto');
    note.style.backgroundColor = noteData.color || '#f8f0cc';
    note.style.zIndex = '10000';
    note.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)'; // 輕微陰影替代邊框
    note.style.border = 'none'; // 移除邊框
    note.style.borderRadius = '2px'; // 保持輕微圓角
    
    // 添加刪除按鈕
    const deleteButton = document.createElement('div');
    deleteButton.className = 'focuscut-delete-button';
    deleteButton.innerHTML = '×';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      note.remove();
      state.elements.notes = state.elements.notes.filter(n => n !== noteData);
      saveElements();
    });
    note.appendChild(deleteButton);
    
    // 添加調整大小控制點
    const resizer = document.createElement('div');
    resizer.className = 'focuscut-resizer focuscut-resizer-both';
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      initResize(e, note, noteData, 'both');
    });
    note.appendChild(resizer);
    
    // 添加文本區域
    const textarea = document.createElement('textarea');
    textarea.value = noteData.text || '';
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.minHeight = '80px';
    textarea.style.border = '1px solid rgba(0,0,0,0.1)'; // 添加輕微的邊框
    textarea.style.resize = 'none';
    textarea.style.background = 'transparent';
    textarea.style.fontFamily = 'inherit';
    textarea.style.fontSize = '14px';
    textarea.style.padding = '8px';
    textarea.style.outline = 'none'; // 移除focus時的outline
    textarea.style.lineHeight = '1.6';
    textarea.style.boxShadow = 'none'; // 移除內部陰影
    textarea.style.borderRadius = '2px';
    textarea.style.transition = 'border-color 0.2s ease'; // 添加過渡效果
    
    textarea.addEventListener('focus', () => {
      textarea.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      textarea.style.borderColor = 'rgba(0,0,0,0.2)'; // 聚焦時邊框顏色加深
    });
    textarea.addEventListener('blur', () => {
      textarea.style.backgroundColor = 'transparent';
      textarea.style.borderColor = 'rgba(0,0,0,0.1)'; // 失焦時恢復原邊框顏色
    });
    
    textarea.addEventListener('input', (e) => {
      noteData.text = e.target.value;
      saveElements();
    });
    note.appendChild(textarea);
    
    makeDraggable(note, noteData);
    
    document.body.appendChild(note);
    resolve(note);
  });
}

// 使元素可拖動
function makeDraggable(element, data) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;
  
  element.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    // 排除點擊控制元素的情況
    if (e.target.classList.contains('focuscut-delete-button') || 
        e.target.classList.contains('focuscut-resizer') ||
        e.target.classList.contains('note-delete') ||
        e.target.classList.contains('note-color-picker') ||
        e.target.tagName.toLowerCase() === 'textarea') {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // 記錄起始位置
    startX = e.clientX;
    startY = e.clientY;
    
    // 獲取元素當前位置
    const style = window.getComputedStyle(element);
    initialLeft = parseInt(style.left);
    initialTop = parseInt(style.top);
    
    isDragging = true;
    
    // 增加拖曳時的樣式
    element.style.opacity = '0.8';
    
    document.addEventListener('mousemove', elementDrag);
    document.addEventListener('mouseup', closeDragElement);
  }
  
  function elementDrag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 計算移動的距離
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // 更新元素位置
    const newLeft = initialLeft + dx;
    const newTop = initialTop + dy;
    
    element.style.left = newLeft + 'px';
    element.style.top = newTop + 'px';
    
    // 更新數據，但先不保存，避免頻繁存儲
    data.position.x = newLeft;
    data.position.y = newTop;
  }
  
  function closeDragElement(e) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 恢復原始透明度
    element.style.opacity = '1';
    
    // 移除事件監聽器
    document.removeEventListener('mousemove', elementDrag);
    document.removeEventListener('mouseup', closeDragElement);
    
    // 完成拖曳時保存一次
    saveElements();
  }
}

// 添加分隔線
async function addDivider(color = '#ff6b6b') {
  console.log('FocusCut: Adding divider with color', color);
  const dividerData = {
    color: color,
    position: { x: 20, y: window.scrollY + 100 },
    width: '40%'
  };
  state.elements.dividers.push(dividerData);
  try {
    await createDivider(dividerData);
    saveElements();
  } catch (error) {
    console.error('FocusCut: Error adding divider:', error);
  }
}

// 添加色卡
async function addBlock(color = '#ff6b6b') {
  console.log('FocusCut: Adding reading card with color', color);
  const blockData = {
    color: color,
    position: { x: 50, y: window.scrollY + 150 },
    size: { width: 600, height: 200 }
  };
  state.elements.blocks.push(blockData);
  try {
    await createBlock(blockData);
    saveElements();
  } catch (error) {
    console.error('FocusCut: Error adding block:', error);
  }
}

// 添加便利貼
async function addNote(color = '#f8f0cc') {
  console.log('FocusCut: Adding note with color', color);
  const noteData = {
    text: '',
    color: color,
    position: { x: 20, y: window.scrollY + 50 },
    width: '250px',
    height: '150px'
  };
  state.elements.notes.push(noteData);
  try {
    await createNote(noteData);
    saveElements();
  } catch (error) {
    console.error('FocusCut: Error adding note:', error);
  }
}

// 確保只調用一次初始化函數，移除底部的重複調用
// initializeExtension(); 

// 最新的初始化調用移至文件頂部，確保只有一個初始化調用 

// 初始化遮色片調整大小功能
function initMaskResize(e, isTop) {
  const startY = e.clientY;
  const startHeight = isTop ? topMaskHeight : bottomMaskHeight;
  
  function doDrag(e) {
    e.preventDefault();
    
    const dy = e.clientY - startY;
    let newHeight;
    
    if (isTop) {
      // 上方遮色片向下拖拽時高度增加
      newHeight = startHeight + dy;
      if (newHeight >= 0 && newHeight <= window.innerHeight - bottomMaskHeight - 50) {
        topMaskHeight = newHeight;
        readingMaskTop.style.height = topMaskHeight + 'px';
      }
    } else {
      // 下方遮色片向上拖拽時高度增加
      newHeight = startHeight - dy;
      if (newHeight >= 0 && newHeight <= window.innerHeight - topMaskHeight - 50) {
        bottomMaskHeight = newHeight;
        readingMaskBottom.style.height = bottomMaskHeight + 'px';
      }
    }
  }
  
  function stopDrag() {
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', stopDrag);
  }
  
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', stopDrag);
}

// 新增: 螢光筆功能
function toggleHighlighter(color) {
  if (state.highlighter.isActive) {
    disableHighlighter();
  } else {
    enableHighlighter(color);
  }
}

// 開啟螢光筆模式
function enableHighlighter(color) {
  if (state.highlighter.isActive && state.highlighter.color === color) return;
  
  console.log('FocusCut: Enabling highlighter with color:', color);
  
  // 設置當前顏色
  state.highlighter.color = color || state.highlighter.color;
  state.highlighter.isActive = true;
  
  // 移除現有的螢光筆游標樣式
  document.body.classList.remove('focuscut-highlight-cursor');
  
  // 移除所有自定義螢光筆游標
  const oldStyle = document.getElementById('focuscut-cursor-style');
  if (oldStyle) {
    oldStyle.remove();
  }
  
  // 創建帶有特定顏色的游標樣式
  const cursorStyle = document.createElement('style');
  cursorStyle.id = 'focuscut-cursor-style';
  
  // 創建帶有正確顏色的游標 SVG
  const encodedColor = encodeURIComponent(color);
  const cursorSvg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M22,2L10,14L8,24L18,22L30,10L22,2z" stroke="black" stroke-width="2" fill="${encodedColor}"/></svg>') 3 29, auto !important`;
  
  cursorStyle.textContent = `
    .focuscut-highlight-cursor {
      cursor: ${cursorSvg};
    }
    .focuscut-highlight-selecting {
      cursor: ${cursorSvg};
      user-select: text !important;
    }
  `;
  
  document.head.appendChild(cursorStyle);
  
  // 添加螢光筆游標樣式
  document.body.classList.add('focuscut-highlight-cursor');
  
  // 鼠標按下時開始選擇文字
  document.addEventListener('mousedown', startTextSelection);
  
  // 更新筆盒 UI，標記當前選中的筆
  updatePenBoxActiveState(color);
}

// 關閉螢光筆模式
function disableHighlighter() {
  if (!state.highlighter.isActive) return;
  
  console.log('FocusCut: Disabling highlighter');
  
  state.highlighter.isActive = false;
  
  // 移除螢光筆游標樣式
  document.body.classList.remove('focuscut-highlight-cursor');
  document.body.classList.remove('focuscut-highlight-selecting');
  document.body.classList.remove('focuscut-eraser-cursor');
  document.body.classList.remove('focuscut-eraser-dragging');
  
  // 移除自定義螢光筆游標樣式元素
  const cursorStyle = document.getElementById('focuscut-cursor-style');
  if (cursorStyle) {
    cursorStyle.remove();
  }
  
  // 移除事件監聽器
  document.removeEventListener('mousedown', startTextSelection);
  document.removeEventListener('mousedown', startDocumentEraserDrag);
  document.removeEventListener('mousemove', eraserDragHandler);
  document.removeEventListener('mouseup', stopEraserDrag);
  
  // 確保移除提示
  const tooltip = document.getElementById('focuscut-highlighter-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  
  // 預設顯示游標為活躍狀態
  updatePenBoxActiveState(null, 'cursor');
}

// 創建螢光筆提示
function showHighlighterTooltip() {
  const tooltip = document.createElement('div');
  tooltip.id = 'focuscut-highlighter-tooltip';
  tooltip.style.position = 'fixed';
  tooltip.style.bottom = '20px';
  tooltip.style.left = '20px';
  tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '8px 12px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.zIndex = '2147483647'; // 修改Z-index，確保在遮色片上方顯示
  tooltip.style.fontSize = '14px';
  tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
  tooltip.style.transition = 'opacity 0.3s';
  tooltip.textContent = chrome.i18n.getMessage('highlighterTooltip') || '螢光筆模式已啟動 - 選擇文字進行標記 (點擊筆盒中的游標圖示退出)';
  
  document.body.appendChild(tooltip);
  
  // 3秒後淡出
  setTimeout(() => {
    tooltip.style.opacity = '0.5';
  }, 3000);
}

// 移除螢光筆提示
function removeHighlighterTooltip() {
  const tooltip = document.getElementById('focuscut-highlighter-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// 開始文字選擇
function startTextSelection(e) {
  if (!state.highlighter.isActive) return;
  
  // 避免在控制元素上啟動
  if (e.target.closest('.focuscut-block, .focuscut-divider, .focuscut-sticky-note, .focuscut-reading-mask-controls')) {
    return;
  }
  
  // 添加選擇樣式
  document.body.classList.add('focuscut-highlight-selecting');
  
  // 等待選擇完成
  document.addEventListener('mouseup', handleTextSelection);
}

// 處理文字選擇
function handleTextSelection(e) {
  // 移除選擇樣式
  document.body.classList.remove('focuscut-highlight-selecting');
  
  // 移除事件監聽器
  document.removeEventListener('mouseup', handleTextSelection);
  
  // 獲取選擇的文字
  const selection = window.getSelection();
  if (!selection.toString().trim()) {
    return; // 沒有選擇文字，不做處理
  }
  
  // 為選擇的每個範圍創建高亮
  const ranges = getSelectionRanges(selection);
  
  if (ranges.length > 0) {
    createHighlights(ranges, state.highlighter.color);
  }
  
  // 清除選擇
  selection.removeAllRanges();
}

// 獲取選擇的所有範圍
function getSelectionRanges(selection) {
  const ranges = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i).cloneRange());
  }
  return ranges;
}

// 創建高亮元素
function createHighlights(ranges, color) {
  const highlights = [];
  const highlightElements = []; // 儲存新創建的DOM元素
  
  // 處理每個選擇範圍
  ranges.forEach(range => {
    // 獲取範圍的位置資訊
    const rects = range.getClientRects();
    
    // 為每個矩形創建高亮元素
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      
      // 創建高亮元素
      const highlight = document.createElement('div');
      highlight.className = 'focuscut-highlighter';
      
      // 設置高亮元素的位置和大小
      highlight.style.left = (rect.left + window.scrollX) + 'px';
      highlight.style.top = (rect.top + window.scrollY) + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';
      
      // 設置高亮顏色
      const rgba = convertToRGBA(color, 0.5);
      highlight.style.backgroundColor = rgba;
      
      // 添加到頁面
      document.body.appendChild(highlight);
      
      // 添加到高亮陣列中
      const highlightData = {
        position: {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY
        },
        size: {
          width: rect.width,
          height: rect.height
        },
        color: color
      };
      
      highlights.push(highlightData);
      highlightElements.push(highlight); // 儲存DOM元素引用
      state.elements.highlights.push(highlightData);
    }
  });
  
  // 記錄本次操作到歷史
  if (highlights.length > 0) {
    const operation = {
      type: 'add',
      data: highlights,
      elements: highlightElements
    };
    state.highlighter.history.push(operation);
    
    // 限制歷史記錄長度，避免佔用過多記憶體
    if (state.highlighter.history.length > 50) {
      state.highlighter.history.shift();
    }
  }
  
  // 保存高亮到本地存儲
  saveElements();
  
  return highlights;
}

// 恢復已儲存的高亮
function restoreHighlights(highlightData) {
  if (!highlightData || !Array.isArray(highlightData)) return;
  
  highlightData.forEach(data => {
    // 創建高亮元素
    const highlight = document.createElement('div');
    highlight.className = 'focuscut-highlighter';
    
    // 設置高亮元素的位置和大小
    highlight.style.left = data.position.x + 'px';
    highlight.style.top = data.position.y + 'px';
    highlight.style.width = data.size.width + 'px';
    highlight.style.height = data.size.height + 'px';
    
    // 設置高亮顏色
    const rgba = convertToRGBA(data.color, 0.5);
    highlight.style.backgroundColor = rgba;
    
    // 添加到頁面
    document.body.appendChild(highlight);
    
    // 如果當前在橡皮擦模式，添加擦除功能
    if (document.body.classList.contains('focuscut-eraser-cursor')) {
      highlight.addEventListener('click', eraseHighlight);
      highlight.addEventListener('mousedown', startEraserDrag);
      highlight.addEventListener('mouseenter', eraseIfDragging);
    }
  });
}

// 原來的 createReadingMask 函數現在作為一個兼容性包裝器，總是使用預設設定
function createReadingMask() {
  const defaultStyle = {
    style: 'white-blur',
    color: 'rgba(245, 245, 245, 0.4)' // #F5F5F5 with opacity 0.4
  };
  createMaskWithStyle(defaultStyle);
}

// 創建並顯示螢光筆筆盒
function createHighlighterPenBox() {
  // 檢查是否已存在筆盒
  const existingPenBox = document.getElementById('focuscut-pen-box');
  if (existingPenBox) {
    return existingPenBox;
  }
  
  // 預設螢光筆顏色
  const highlighterColors = [
    '#ffff00', // 黃色
    '#ffbd69', // 橙色
    '#82ccff'  // 藍色
  ];
  
  // 創建筆盒容器
  const penBox = document.createElement('div');
  penBox.id = 'focuscut-pen-box';
  penBox.style.position = 'fixed';
  penBox.style.left = '20px';
  penBox.style.bottom = '20px';
  penBox.style.backgroundColor = '#f0f0f0';
  penBox.style.borderRadius = '15px';
  penBox.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
  penBox.style.padding = '12px 10px';
  penBox.style.display = 'flex';
  penBox.style.flexDirection = 'column';
  penBox.style.gap = '8px';
  penBox.style.zIndex = '2147483647'; // 增加z-index值，確保在遮色片上方顯示
  penBox.style.border = '1px solid #ddd';
  penBox.style.width = '60px';
  
  // 添加一個游標按鈕 (退出螢光筆模式) - 移到第一位
  const cursorBtn = document.createElement('div');
  cursorBtn.className = 'focuscut-pen-tool';
  cursorBtn.id = 'focuscut-cursor-btn';
  cursorBtn.style.width = '28px';
  cursorBtn.style.height = '28px';
  cursorBtn.style.cursor = 'pointer';
  cursorBtn.style.display = 'flex';
  cursorBtn.style.alignItems = 'center';
  cursorBtn.style.justifyContent = 'center';
  cursorBtn.style.position = 'relative';
  cursorBtn.style.alignSelf = 'center';
  
  // 創建游標圖標
  const cursorIcon = document.createElement('div');
  cursorIcon.className = 'focuscut-cursor-icon';
  cursorIcon.style.width = '20px';
  cursorIcon.style.height = '20px';
  cursorIcon.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><path d="M7,4l0,22l4,-4l4,8l4,-2l-4,-8l6,0z" stroke="black" stroke-width="2" fill="white"/></svg>')`;
  cursorIcon.style.backgroundSize = 'contain';
  cursorIcon.style.backgroundRepeat = 'no-repeat';
  cursorIcon.style.backgroundPosition = 'center';
  
  // 當點擊游標按鈕時退出螢光筆模式
  cursorBtn.addEventListener('click', () => {
    // 停用高亮模式
    disableHighlighter();
    
    // 停用橡皮擦模式
    disableEraserMode();
    
    // 更新筆盒 UI 狀態
    updatePenBoxActiveState(null, 'cursor');
  });
  
  // 組裝游標按鈕
  cursorBtn.appendChild(cursorIcon);
  
  // 將游標按鈕添加到筆盒 (第一位)
  penBox.appendChild(cursorBtn);
  
  // 創建三支螢光筆
  highlighterColors.forEach(color => {
    const highlighterPen = document.createElement('div');
    highlighterPen.className = 'focuscut-highlighter-pen';
    highlighterPen.dataset.color = color; // 儲存顏色到 data-color 屬性
    highlighterPen.style.width = '28px';
    highlighterPen.style.height = '28px';
    highlighterPen.style.cursor = 'pointer';
    highlighterPen.style.display = 'flex';
    highlighterPen.style.alignItems = 'center';
    highlighterPen.style.justifyContent = 'center';
    highlighterPen.style.position = 'relative';
    highlighterPen.style.alignSelf = 'center';
    
    // 創建簡約風格的螢光筆圖標 (與游標相同)
    const penIcon = document.createElement('div');
    penIcon.className = 'focuscut-pen-icon';
    penIcon.style.width = '20px';
    penIcon.style.height = '20px';
    penIcon.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32"><path d="M22,2L10,14L8,24L18,22L30,10L22,2z" stroke="black" stroke-width="2" fill="${encodeURIComponent(color)}"/></svg>')`;
    penIcon.style.backgroundSize = 'contain';
    penIcon.style.backgroundRepeat = 'no-repeat';
    penIcon.style.backgroundPosition = 'center';
    
    // 添加點擊事件 - 不管是否已啟用，都切換到這支筆
    highlighterPen.addEventListener('click', () => {
      if (state.highlighter.isActive && state.highlighter.color === color) {
        // 如果已經是此顏色，不需要做任何事
        return;
      }
      
      // 停用橡皮擦模式
      disableEraserMode();
      
      // 先禁用現有螢光筆，再啟用新顏色
      if (state.highlighter.isActive) {
        // 完全重新啟用以更新游標顏色
        enableHighlighter(color);
      } else {
        // 完全新啟用
        enableHighlighter(color);
      }
    });
    
    // 組裝螢光筆
    highlighterPen.appendChild(penIcon);
    penBox.appendChild(highlighterPen);
  });
  
  // 添加一個橡皮擦按鈕 (簡約風格)
  const eraserBtn = document.createElement('div');
  eraserBtn.className = 'focuscut-pen-tool';
  eraserBtn.id = 'focuscut-eraser-btn';
  eraserBtn.style.width = '28px';
  eraserBtn.style.height = '28px';
  eraserBtn.style.cursor = 'pointer';
  eraserBtn.style.display = 'flex';
  eraserBtn.style.alignItems = 'center';
  eraserBtn.style.justifyContent = 'center';
  eraserBtn.style.position = 'relative';
  eraserBtn.style.alignSelf = 'center';
  
  // 創建簡約風格的橡皮擦圖標
  const eraserIcon = document.createElement('div');
  eraserIcon.className = 'focuscut-eraser-icon';
  eraserIcon.style.width = '20px';
  eraserIcon.style.height = '20px';
  eraserIcon.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='200' height='200'%3E%3Cg transform='rotate(-45 100 100)'%3E%3Crect x='30' y='70' width='140' height='60' rx='15' ry='15' fill='white' stroke='black' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='72' y1='70' x2='72' y2='130' stroke='black' stroke-width='10' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E")`;
  eraserIcon.style.backgroundSize = 'contain';
  eraserIcon.style.backgroundRepeat = 'no-repeat';
  eraserIcon.style.backgroundPosition = 'center';
  
  // 當點擊橡皮擦按鈕時切換到橡皮擦模式
  eraserBtn.addEventListener('click', () => {
    // 停用高亮模式
    if (state.highlighter.isActive) {
      disableHighlighter();
    }
    
    // 啟用橡皮擦模式
    enableEraserMode();
    
    // 更新筆盒 UI 狀態
    updatePenBoxActiveState(null, 'eraser');
  });
  
  // 組裝橡皮擦按鈕
  eraserBtn.appendChild(eraserIcon);
  
  // 將橡皮擦添加到筆盒
  penBox.appendChild(eraserBtn);
  
  // 添加筆盒到頁面
  document.body.appendChild(penBox);
  
  // 預設顯示游標為活躍狀態
  cursorBtn.classList.add('active');
  
  return penBox;
}

// 停用橡皮擦模式
function disableEraserMode() {
  // 移除橡皮擦游標樣式
  document.body.classList.remove('focuscut-eraser-cursor');
  document.body.classList.remove('focuscut-eraser-dragging');
  
  // 移除事件監聽器
  document.removeEventListener('mousedown', startDocumentEraserDrag);
  document.removeEventListener('mousemove', eraserDragHandler);
  document.removeEventListener('mouseup', stopEraserDrag);
  
  // 移除高亮元素上的擦除事件
  const highlights = document.querySelectorAll('.focuscut-highlighter');
  highlights.forEach(highlight => {
    highlight.removeEventListener('click', eraseHighlight);
    highlight.removeEventListener('mousedown', startEraserDrag);
    highlight.removeEventListener('mouseenter', eraseIfDragging);
  });
  
  // 移除自定義游標樣式元素
  const cursorStyle = document.getElementById('focuscut-cursor-style');
  if (cursorStyle) {
    cursorStyle.remove();
  }
}

// 開啟橡皮擦模式
function enableEraserMode() {
  console.log('FocusCut: Enabling eraser mode');
  
  // 禁用螢光筆模式
  if (state.highlighter.isActive) {
    // 移除螢光筆游標樣式
    document.body.classList.remove('focuscut-highlight-cursor');
    document.body.classList.remove('focuscut-highlight-selecting');
    
    // 移除事件監聽器
    document.removeEventListener('mousedown', startTextSelection);
  }
  
  state.highlighter.isActive = false;
  
  // 移除任何現有的自定義游標樣式
  const oldStyle = document.getElementById('focuscut-cursor-style');
  if (oldStyle) {
    oldStyle.remove();
  }
  
  // 創建橡皮擦游標樣式
  const cursorStyle = document.createElement('style');
  cursorStyle.id = 'focuscut-cursor-style';
  
  // 創建橡皮擦游標SVG - 使用URL編碼處理SVG以確保在CSS游標屬性中正確顯示
  const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='32' height='32'%3E%3Cg transform='rotate(-45 100 100)'%3E%3Crect x='30' y='70' width='140' height='60' rx='15' ry='15' fill='white' stroke='black' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='72' y1='70' x2='72' y2='130' stroke='black' stroke-width='10' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E") 15 15, auto !important`;
  
  cursorStyle.textContent = `
    .focuscut-eraser-cursor, .focuscut-highlighter {
      cursor: ${eraserCursor};
    }
    
    .focuscut-eraser-dragging, .focuscut-eraser-dragging * {
      cursor: ${eraserCursor} !important;
      user-select: none !important;
    }
  `;
  
  document.head.appendChild(cursorStyle);
  
  // 添加橡皮擦游標樣式到body
  document.body.classList.add('focuscut-eraser-cursor');
  
  // 移除之前可能存在的mousemove事件監聽器
  document.removeEventListener('mousemove', eraserDragHandler);
  document.removeEventListener('mouseup', stopEraserDrag);
  
  // 添加點擊事件到所有高亮元素，同時支持拖曳擦除
  setupHighlighterErasing();
  
  // 添加文檔級別的mousedown監聽，讓用戶可以從任意位置開始拖曳擦除
  document.addEventListener('mousedown', startDocumentEraserDrag);
  
  // 確保移除任何提示
  const tooltip = document.getElementById('focuscut-highlighter-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// 設置高亮元素的擦除功能
function setupHighlighterErasing() {
  const highlights = document.querySelectorAll('.focuscut-highlighter');
  
  // 為每個高亮元素添加點擊擦除功能
  highlights.forEach(highlight => {
    // 移除可能已存在的監聽器以避免重複
    highlight.removeEventListener('click', eraseHighlight);
    highlight.removeEventListener('mousedown', startEraserDrag);
    highlight.removeEventListener('mouseenter', eraseIfDragging);
    
    // 添加點擊和拖曳監聽器
    highlight.addEventListener('click', eraseHighlight);
    highlight.addEventListener('mousedown', startEraserDrag);
    highlight.addEventListener('mouseenter', eraseIfDragging);
  });
  
  // 添加全局拖曳停止監聽器
  document.addEventListener('mouseup', stopEraserDrag);
}

// 拖曳擦除開始
function startEraserDrag(e) {
  // 如果不在橡皮擦模式則不處理
  if (!document.body.classList.contains('focuscut-eraser-cursor')) return;
  
  // 防止觸發額外的點擊事件
  e.preventDefault();
  
  // 標記為正在拖曳擦除
  document.body.classList.add('focuscut-eraser-dragging');
  
  // 立即擦除當前元素
  eraseHighlight(e);
  
  // 添加鼠標移動監聽器
  document.addEventListener('mousemove', eraserDragHandler);
}

// 拖曳擦除移動處理器
function eraserDragHandler(e) {
  // 檢查鼠標下方的元素
  const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
  
  // 檢查是否有高亮元素
  const highlightUnderCursor = elementsUnderCursor.find(el => 
    el.classList.contains('focuscut-highlighter')
  );
  
  // 如果有高亮元素，擦除它
  if (highlightUnderCursor) {
    const eraseEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    highlightUnderCursor.dispatchEvent(eraseEvent);
  }
}

// 如果正在拖曳，則擦除進入的元素
function eraseIfDragging(e) {
  if (document.body.classList.contains('focuscut-eraser-dragging')) {
    eraseHighlight(e);
  }
}

// 拖曳擦除停止
function stopEraserDrag() {
  // 移除拖曳狀態
  document.body.classList.remove('focuscut-eraser-dragging');
  
  // 移除鼠標移動監聽器
  document.removeEventListener('mousemove', eraserDragHandler);
}

// 擦除高亮元素
function eraseHighlight(e) {
  const highlight = e.currentTarget;
  
  // 找到對應的數據
  const rect = highlight.getBoundingClientRect();
  const position = {
    x: parseFloat(highlight.style.left),
    y: parseFloat(highlight.style.top)
  };
  
  const size = {
    width: parseFloat(highlight.style.width),
    height: parseFloat(highlight.style.height)
  };
  
  // 找到要刪除的高亮數據
  const removedHighlights = state.elements.highlights.filter(h => {
    return (Math.abs(h.position.x - position.x) < 1 && 
            Math.abs(h.position.y - position.y) < 1 &&
            Math.abs(h.size.width - size.width) < 1 &&
            Math.abs(h.size.height - size.height) < 1);
  });
  
  // 記錄刪除操作到歷史
  if (removedHighlights.length > 0) {
    const operation = {
      type: 'remove',
      data: removedHighlights,
      elements: [highlight] // 儲存被刪除的DOM元素
    };
    state.highlighter.history.push(operation);
    
    // 限制歷史記錄長度
    if (state.highlighter.history.length > 50) {
      state.highlighter.history.shift();
    }
  }
  
  // 從DOM中移除元素
  highlight.remove();
  
  // 從狀態數組中過濾掉此高亮
  state.elements.highlights = state.elements.highlights.filter(h => {
    return !(Math.abs(h.position.x - position.x) < 1 && 
             Math.abs(h.position.y - position.y) < 1 &&
             Math.abs(h.size.width - size.width) < 1 &&
             Math.abs(h.size.height - size.height) < 1);
  });
  
  // 保存更改
  saveElements();
}

// 更新筆盒中的按鈕活躍狀態
function updatePenBoxActiveState(color = null, tool = null) {
  const penBox = document.getElementById('focuscut-pen-box');
  if (!penBox) return;
  
  // 清除所有活躍狀態
  const allItems = penBox.querySelectorAll('.focuscut-highlighter-pen, .focuscut-pen-tool');
  allItems.forEach(item => {
    item.classList.remove('active');
  });
  
  // 設置新的活躍狀態
  if (color) {
    // 設置選中的螢光筆
    const activePen = penBox.querySelector(`.focuscut-highlighter-pen[data-color="${color}"]`);
    if (activePen) {
      activePen.classList.add('active');
    }
  } else if (tool === 'eraser') {
    // 設置選中的橡皮擦
    const eraserBtn = document.getElementById('focuscut-eraser-btn');
    if (eraserBtn) {
      eraserBtn.classList.add('active');
    }
  } else if (tool === 'cursor') {
    // 設置選中的游標
    const cursorBtn = document.getElementById('focuscut-cursor-btn');
    if (cursorBtn) {
      cursorBtn.classList.add('active');
    }
  }
}

// 從文檔任意位置開始拖曳擦除
function startDocumentEraserDrag(e) {
  // 如果不在橡皮擦模式則不處理
  if (!document.body.classList.contains('focuscut-eraser-cursor')) return;
  
  // 避免在控制元素上啟動
  if (e.target.closest('#focuscut-pen-box, .focuscut-block, .focuscut-divider, .focuscut-sticky-note, .focuscut-reading-mask-controls')) {
    return;
  }
  
  // 如果已經點擊在高亮元素上，則不需要在這裡處理，讓專門的處理器處理
  if (e.target.classList.contains('focuscut-highlighter')) {
    return;
  }
  
  // 防止觸發可能的文本選擇
  e.preventDefault();
  
  // 標記為正在拖曳擦除
  document.body.classList.add('focuscut-eraser-dragging');
  
  // 添加鼠標移動監聽器
  document.addEventListener('mousemove', eraserDragHandler);
  document.addEventListener('mouseup', stopEraserDrag);
} 

// 撤銷螢光筆操作
function undoHighlighterAction() {
  // 如果沒有歷史記錄，直接返回
  if (state.highlighter.history.length === 0) {
    console.log('FocusCut: No highlighter history to undo');
    return;
  }
  
  // 獲取最後一個操作
  const lastOperation = state.highlighter.history.pop();
  
  if (lastOperation.type === 'add') {
    // 撤銷添加操作 - 刪除添加的高亮
    lastOperation.elements.forEach(element => {
      if (element && element.parentNode) {
        element.remove();
      }
    });
    
    // 從狀態中移除相應的數據
    lastOperation.data.forEach(highlightData => {
      const index = state.elements.highlights.findIndex(h => 
        Math.abs(h.position.x - highlightData.position.x) < 1 && 
        Math.abs(h.position.y - highlightData.position.y) < 1 &&
        Math.abs(h.size.width - highlightData.size.width) < 1 &&
        Math.abs(h.size.height - highlightData.size.height) < 1
      );
      
      if (index !== -1) {
        state.elements.highlights.splice(index, 1);
      }
    });
    
    console.log('FocusCut: Undid add operation, removed', lastOperation.elements.length, 'highlights');
  } else if (lastOperation.type === 'remove') {
    // 撤銷刪除操作 - 重新創建被刪除的高亮
    lastOperation.data.forEach(highlightData => {
      // 創建高亮元素
      const highlight = document.createElement('div');
      highlight.className = 'focuscut-highlighter';
      
      // 設置高亮元素的位置和大小
      highlight.style.left = highlightData.position.x + 'px';
      highlight.style.top = highlightData.position.y + 'px';
      highlight.style.width = highlightData.size.width + 'px';
      highlight.style.height = highlightData.size.height + 'px';
      
      // 設置高亮顏色
      const rgba = convertToRGBA(highlightData.color, 0.5);
      highlight.style.backgroundColor = rgba;
      
      // 添加到頁面
      document.body.appendChild(highlight);
      
      // 如果當前在橡皮擦模式，添加擦除功能
      if (document.body.classList.contains('focuscut-eraser-cursor')) {
        highlight.addEventListener('click', eraseHighlight);
        highlight.addEventListener('mousedown', startEraserDrag);
        highlight.addEventListener('mouseenter', eraseIfDragging);
      }
      
      // 添加回狀態中
      state.elements.highlights.push(highlightData);
    });
    
    console.log('FocusCut: Undid remove operation, restored', lastOperation.data.length, 'highlights');
  } else if (lastOperation.type === 'remove-all') {
    // 撤銷全部刪除操作 - 重新創建所有被刪除的高亮
    lastOperation.data.forEach(highlightData => {
      // 創建高亮元素
      const highlight = document.createElement('div');
      highlight.className = 'focuscut-highlighter';
      
      // 設置高亮元素的位置和大小
      highlight.style.left = highlightData.position.x + 'px';
      highlight.style.top = highlightData.position.y + 'px';
      highlight.style.width = highlightData.size.width + 'px';
      highlight.style.height = highlightData.size.height + 'px';
      
      // 設置高亮顏色
      const rgba = convertToRGBA(highlightData.color, 0.5);
      highlight.style.backgroundColor = rgba;
      
      // 添加到頁面
      document.body.appendChild(highlight);
      
      // 如果當前在橡皮擦模式，添加擦除功能
      if (document.body.classList.contains('focuscut-eraser-cursor')) {
        highlight.addEventListener('click', eraseHighlight);
        highlight.addEventListener('mousedown', startEraserDrag);
        highlight.addEventListener('mouseenter', eraseIfDragging);
      }
      
      // 添加回狀態中
      state.elements.highlights.push(highlightData);
    });
    
    console.log('FocusCut: Undid remove-all operation, restored', lastOperation.data.length, 'highlights');
  }
  
  // 保存更改
  saveElements();
}

// 清除所有高亮，並記錄到歷史
function clearAllHighlights() {
  console.log('FocusCut: Clearing all highlights');
  
  // 獲取所有高亮元素
  const highlights = document.querySelectorAll('.focuscut-highlighter');
  
  // 如果沒有高亮元素，直接返回
  if (highlights.length === 0) {
    console.log('FocusCut: No highlights to clear');
    return;
  }
  
  // 收集所有高亮元素和數據以記錄到歷史
  const highlightElements = Array.from(highlights);
  const removedHighlights = [...state.elements.highlights];
  
  // 記錄批量刪除操作到歷史
  if (removedHighlights.length > 0) {
    const operation = {
      type: 'remove-all',
      data: removedHighlights,
      elements: highlightElements
    };
    state.highlighter.history.push(operation);
    
    // 限制歷史記錄長度
    if (state.highlighter.history.length > 50) {
      state.highlighter.history.shift();
    }
  }
  
  // 從DOM中移除所有高亮元素
  highlightElements.forEach(highlight => {
    highlight.remove();
  });
  
  // 清空狀態中的高亮數組
  state.elements.highlights = [];
  
  // 保存更改
  saveElements();
  
  console.log('FocusCut: Cleared', highlightElements.length, 'highlights');
}
