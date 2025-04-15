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
    color: '#ffff00'  // 預設黃色
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

function toggleReadingMask() {
  if (isMaskActive) {
    removeReadingMask();
  } else {
    createReadingMask();
  }
}

function createReadingMask() {
  // 先檢查是否已經存在遮色片，避免重複創建
  if (document.querySelector('.focuscut-reading-mask-top') || 
      document.querySelector('.focuscut-reading-mask-bottom')) {
    console.log('FocusCut: Reading mask already exists, removing first');
    removeReadingMask();
  }

  console.log('FocusCut: Creating reading mask');

  try {
    // 創建上方遮色片
    readingMaskTop = document.createElement('div');
    readingMaskTop.className = 'focuscut-reading-mask-top';
    readingMaskTop.style.height = topMaskHeight + 'px'; // 使用變量
    readingMaskTop.style.zIndex = '20000'; // 確保足夠高的z-index
    readingMaskTop.style.backgroundColor = 'rgba(120, 120, 120, 0.4)'; // 灰色半透明
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
    readingMaskBottom.style.zIndex = '20000'; // 確保足夠高的z-index
    readingMaskBottom.style.backgroundColor = 'rgba(120, 120, 120, 0.4)'; // 灰色半透明
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
    readingMaskControls.style.zIndex = '20001'; // 確保控制面板在最上層
    
    const closeButton = document.createElement('button');
    closeButton.textContent = chrome.i18n.getMessage('closeReadingMask') || '關閉遮色片';
    closeButton.style.cursor = 'pointer';
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
  console.log('FocusCut: Message received in content script:', request);
  
  // 立即發送回應
  sendResponse({ success: true });
  
  if (!state.isInitialized) {
    console.warn('FocusCut: Not initialized yet, ignoring message');
    return;
  }
  
  // 使用 async 立即調用函數來處理異步操作
  (async () => {
    try {
      switch (request.action) {
        case 'pageUpdated':
        case 'tabActivated':
          await handleUrlChange(request.url);
          break;
        case 'addDivider':
          await addDivider(request.color);
          break;
        case 'addBlock':
          await addBlock(request.color);
          break;
        case 'addNote':
          await addNote(request.color);
          break;
        case 'toggleReadingMask':
          console.log('FocusCut: Toggling reading mask with style:', request.maskStyle);
          toggleReadingMask(request.maskStyle);
          break;
        case 'enableHighlighter':
          console.log('FocusCut: Enabling highlighter with color:', request.color);
          enableHighlighter(request.color);
          break;
      }
    } catch (error) {
      console.error('FocusCut: Error handling message:', error);
    }
  })();
  
  // 返回 true 表示將異步處理響應
  return true;
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
  if (state.highlighter.isActive) return;
  
  console.log('FocusCut: Enabling highlighter with color:', color);
  
  // 設置當前顏色
  state.highlighter.color = color || state.highlighter.color;
  state.highlighter.isActive = true;
  
  // 添加螢光筆游標樣式
  document.body.classList.add('focuscut-highlight-cursor');
  
  // 鼠標按下時開始選擇文字
  document.addEventListener('mousedown', startTextSelection);
  
  // 添加鍵盤事件監聽器，按ESC鍵退出螢光筆模式
  document.addEventListener('keydown', handleHighlighterKeyDown);
  
  // 創建並顯示提示
  showHighlighterTooltip();
}

// 關閉螢光筆模式
function disableHighlighter() {
  if (!state.highlighter.isActive) return;
  
  console.log('FocusCut: Disabling highlighter');
  
  state.highlighter.isActive = false;
  
  // 移除螢光筆游標樣式
  document.body.classList.remove('focuscut-highlight-cursor');
  
  // 移除事件監聽器
  document.removeEventListener('mousedown', startTextSelection);
  document.removeEventListener('keydown', handleHighlighterKeyDown);
  
  // 移除提示
  removeHighlighterTooltip();
}

// 按ESC退出螢光筆模式
function handleHighlighterKeyDown(e) {
  if (e.key === 'Escape') {
    disableHighlighter();
  }
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
  tooltip.style.zIndex = '2147483646'; // 高於其他元素但低於遮色片
  tooltip.style.fontSize = '14px';
  tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
  tooltip.style.transition = 'opacity 0.3s';
  tooltip.textContent = chrome.i18n.getMessage('highlighterTooltip') || '螢光筆模式已啟動 - 選擇文字進行標記 (ESC退出)';
  
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
      state.elements.highlights.push(highlightData);
    }
  });
  
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
  });
} 
