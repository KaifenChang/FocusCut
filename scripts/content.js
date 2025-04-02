// 全局狀態管理
const state = {
  isInitialized: false,
  isExtensionValid: false,
  initRetryCount: 0,
  currentUrl: window.location.href,
  elements: {
    dividers: [],
    blocks: [],
    notes: []
  }
};

const config = {
  MAX_RETRIES: 5,
  RETRY_DELAY: 1000,
  STORAGE_PREFIX: 'focuscut_',
  EXTENSION_CHECK_INTERVAL: 500
};

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
      }
    } catch (error) {
      console.error('FocusCut: Error handling message:', error);
    }
  })();
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
            notes: Array.isArray(data.notes) ? data.notes : []
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
        notes: Array.isArray(data.notes) ? data.notes : []
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
        notes: Array.isArray(data.notes) ? data.notes : []
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
    notes: []
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
    const focuscutElements = document.querySelectorAll('.focuscut-divider, .focuscut-block, .focuscut-sticky-note');
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
    
    block.style.position = 'absolute';
    block.style.left = blockData.position.x + 'px';
    block.style.top = blockData.position.y + 'px';
    block.style.width = (blockData.size.width || 200) + 'px';
    block.style.height = (blockData.size.height || 100) + 'px';
    block.style.zIndex = '9998';
    
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
    
    const resizer = document.createElement('div');
    resizer.className = 'focuscut-resizer focuscut-resizer-both';
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      initResize(e, block, blockData, 'both');
    });
    block.appendChild(resizer);
    
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
