/**
 * FocusCut Content Script
 * ===========================
 * 
 * 主要功能：
 * - 透明閱讀色卡：幫助聚焦閱讀區域
 * - 遮色片：上下模糊遮罩，突出中間閱讀區域
 * - 便利貼：可拖動的筆記功能
 * - 螢光筆盒：文字高亮和橡皮擦功能
 * 
 * 作者：KXii
 * 版本：v1.3
 */

// =============================================================================
// 全局狀態管理
// =============================================================================

/**
 * 擴展狀態管理對象
 * 包含初始化狀態、元素存儲、螢光筆和橡皮擦狀態
 */
const state = {
  isInitialized: false,                          // 是否已初始化
  isInitializing: false,                        // 是否正在初始化
  isExtensionValid: false,                       // 擴展是否有效
  isRestoring: false,                            // 是否正在從存儲恢復畫面
  isClearing: false,                             // 是否正在清除目前頁面的資料
  isNavigating: false,                           // 是否正在處理 SPA URL 變更
  initRetryCount: 0,                             // 初始化重試次數
  currentUrl: window.location.href,              // 當前頁面URL
  
  // 頁面元素狀態
  elements: {
    dividers: [],                                // 分隔線陣列
    blocks: [],                                  // 色卡陣列
    notes: [],                                   // 便利貼陣列
    highlights: [],                              // 高亮標記陣列
    readingMask: null,                           // 遮色片狀態
    highlighterBox: null                         // 螢光筆盒狀態
  },
  
  // 螢光筆狀態
  highlighter: {
    isActive: false,                             // 是否啟用
    color: '#ffff00'                             // 預設黃色
  },
  
  // 橡皮擦狀態
  eraser: {
    isActive: false,                             // 是否啟用
    isDragging: false                            // 是否正在拖動
  }
};

let eventListenersConfigured = false;            // 避免重複註冊監聽器
let urlCheckIntervalId = null;                    // URL 輪詢計時器
let storageWriteQueue = Promise.resolve();        // 保證儲存寫入順序

/**
 * 配置常數
 */
const config = {
  MAX_RETRIES: 5,                                // 最大重試次數
  RETRY_DELAY: 1000,                             // 重試延遲（毫秒）
  STORAGE_PREFIX: 'focuscut_',                   // 存儲前綴
  EXTENSION_CHECK_INTERVAL: 500,                 // 擴展檢查間隔（毫秒）
  DOM_RETRY_DELAY: 50,                           // 等待頁面容器的檢查間隔（毫秒）
  DOM_READY_TIMEOUT: 5000                        // 等待頁面容器的最長時間（毫秒）
};

async function waitForDocumentBody() {
  const deadline = Date.now() + config.DOM_READY_TIMEOUT;

  while (!document.body) {
    if (Date.now() >= deadline) {
      throw new Error('Page document body is not available');
    }
    await new Promise(resolve => setTimeout(resolve, config.DOM_RETRY_DELAY));
  }

  return document.body;
}

// =============================================================================
// 遮色片全局變數
// =============================================================================

let readingMaskTop = null;                       // 上方遮色片元素
let readingMaskBottom = null;                    // 下方遮色片元素
let readingMaskControls = null;                  // 遮色片控制面板
let isMaskActive = false;                        // 遮色片是否啟用
let isHighlighterBoxVisible = false;             // 螢光筆盒是否顯示

// 遮色片高度（相對於視窗高度）
let topMaskHeight = window.innerHeight * 0.3;     // 上方遮色片高度（30%）
let bottomMaskHeight = window.innerHeight * 0.3;  // 下方遮色片高度（30%）

// =============================================================================
// 遮色片功能
// =============================================================================

/**
 * 切換遮色片顯示/隱藏
 */
function toggleReadingMask() {
  if (isMaskActive) {
    removeReadingMask();
  } else {
    createReadingMaskWithStyle({
      style: 'blur-gray',
      blur: true,
      color: 'rgba(120, 120, 120, 0.4)'
    });
  }
}

/**
 * 創建基本遮色片（舊版函數，保留相容性）
 */
function createReadingMask() {
  // 檢查是否已存在遮色片，避免重複創建
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
    readingMaskTop.style.height = topMaskHeight + 'px';
    readingMaskTop.style.backgroundColor = 'rgba(120, 120, 120, 0.4)';
    readingMaskTop.style.backdropFilter = 'blur(4px)';
    readingMaskTop.style.WebkitBackdropFilter = 'blur(4px)';
    
    // 添加上方遮色片的調整區域
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
    readingMaskBottom.style.height = bottomMaskHeight + 'px';
    readingMaskBottom.style.backgroundColor = 'rgba(120, 120, 120, 0.4)';
    readingMaskBottom.style.backdropFilter = 'blur(4px)';
    readingMaskBottom.style.WebkitBackdropFilter = 'blur(4px)';
    
    // 添加下方遮色片的調整區域
    const bottomEdge = document.createElement('div');
    bottomEdge.className = 'focuscut-reading-mask-edge focuscut-reading-mask-edge-top';
    bottomEdge.title = chrome.i18n.getMessage('dragToAdjustMask') || '拖曳調整遮色片高度';
    bottomEdge.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      initMaskResize(e, false);
    });
    readingMaskBottom.appendChild(bottomEdge);
    
    // 創建控制面板
    readingMaskControls = document.createElement('div');
    readingMaskControls.className = 'focuscut-reading-mask-controls';
    
    // 關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.className = 'focuscut-close-button';
    closeButton.title = chrome.i18n.getMessage('closeReadingMask') || '關閉遮色片';
    
    const closeIcon = document.createElement('span');
    closeIcon.className = 'focuscut-close-icon';
    closeButton.appendChild(closeIcon);
    
    closeButton.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('FocusCut: Closing reading mask');
      removeReadingMask();
    });
    
    readingMaskControls.appendChild(closeButton);
    
    // 添加元素到頁面
    document.body.appendChild(readingMaskTop);
    document.body.appendChild(readingMaskBottom);
    document.body.appendChild(readingMaskControls);
    
    console.log('FocusCut: Mask elements added to the DOM');
    
    // 添加事件監聽器
    window.addEventListener('scroll', positionMasks);
    window.addEventListener('resize', handleResize);
    
    isMaskActive = true;
  } catch (error) {
    console.error('FocusCut: Error creating reading mask:', error);
  }
}

/**
 * 處理視窗大小變化，保持遮色片比例
 */
function handleResize() {
  const viewportHeight = window.innerHeight;
  const topRatio = topMaskHeight / viewportHeight;
  const bottomRatio = bottomMaskHeight / viewportHeight;
  
  topMaskHeight = viewportHeight * topRatio;
  bottomMaskHeight = viewportHeight * bottomRatio;
  
  positionMasks();
}

/**
 * 重新定位遮色片
 */
function positionMasks() {
  if (!readingMaskTop || !readingMaskBottom) {
    console.error('FocusCut: Mask elements not found');
    return;
  }
  
  readingMaskTop.style.height = topMaskHeight + 'px';
  readingMaskBottom.style.height = bottomMaskHeight + 'px';
}

/**
 * 移除遮色片
 */
function removeReadingMask(shouldSave = true) {
  console.log('FocusCut: Removing reading mask');
  
  // 移除DOM元素
  if (readingMaskTop) {
    readingMaskTop.remove();
    readingMaskTop = null;
  }
  
  if (readingMaskBottom) {
    readingMaskBottom.remove();
    readingMaskBottom = null;
  }
  
  if (readingMaskControls) {
    readingMaskControls.remove();
    readingMaskControls = null;
  }
  
  // 移除事件監聽器
  window.removeEventListener('scroll', positionMasks);
  window.removeEventListener('resize', handleResize);
  
  // 更新狀態
  isMaskActive = false;
  state.elements.readingMask = null;
  
  // 保存狀態
  if (shouldSave && state.isInitialized) {
    saveElements();
  }
  
  console.log('FocusCut: Reading mask removed and state cleared');
}

// =============================================================================
// 初始化和生命週期管理
// =============================================================================

/**
 * 擴展初始化入口點
 * 確保 DOM 載入後啟動初始化，並通知背景腳本
 */
(function initializeContentScript() {
  try {
    // 確保 DOM 已載入
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeExtension();
      });
    } else {
      // DOM 已載入，延遲初始化避免衝突
      setTimeout(() => {
        initializeExtension();
      }, 100);
    }
    
    // 嘗試通知背景腳本內容腳本已載入
    chrome.runtime.sendMessage({ 
      action: 'contentScriptLoaded', 
      url: window.location.href 
    });
  } catch (error) {
    console.warn('FocusCut: Failed to send initial message:', error);
    
    // 即使通知失敗也要初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeExtension();
      });
    } else {
      setTimeout(() => {
        initializeExtension();
      }, 100);
    }
  }
})();

/**
 * 安全的 Chrome API 調用包裝器
 * 防止擴展上下文無效時的錯誤
 * @param {Function} operation - 要執行的操作
 * @returns {Promise} - 包裝後的 Promise
 */
async function safeChromeCall(operation) {
  return new Promise((resolve) => {
    // 檢查擴展上下文是否有效
    if (!chrome?.runtime?.id) {
      resolve(null);
      return;
    }

    // 檢查 storage API 是否可用
    if (!chrome?.storage?.local) {
      resolve(null);
      return;
    }

    try {
      operation((result) => {
        if (chrome.runtime.lastError) {
          resolve(null);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      resolve(null);
    }
  });
}

/**
 * 主要初始化函數
 * 處理擴展的完整初始化流程，包含重試機制
 */
async function initializeExtension() {
  // 防止 DOMContentLoaded 與檔案尾端的啟動呼叫同時初始化
  if (state.isInitialized || state.isInitializing) {
    console.log('FocusCut: Already initialized or initializing, skipping...');
    return;
  }
  
  state.isInitializing = true;
  console.log('FocusCut: Starting initialization...');
  
  try {
    // 部分頁面或 SPA 導航期間會短暫移除 body，先等待可掛載的頁面容器。
    await waitForDocumentBody();

    // 檢查擴展上下文有效性
    state.isExtensionValid = await checkExtensionContext();

    // 處理擴展上下文無效的情況
    if (!state.isExtensionValid) {
      if (state.initRetryCount < config.MAX_RETRIES) {
        console.log(`FocusCut: Retrying initialization (${state.initRetryCount + 1}/${config.MAX_RETRIES})`);
        state.initRetryCount++;
        setTimeout(initializeExtension, config.RETRY_DELAY);
        return;
      }
      throw new Error('Chrome extension storage is unavailable');
    }
    
    // 設置事件監聽器和載入保存的元素
    await setupEventListeners();
    await loadSavedElements();
    
    state.isInitialized = true;
    state.initRetryCount = 0;
    console.log('FocusCut: Initialization completed successfully');
    
  } catch (error) {
    console.error('FocusCut: Initialization failed:', error);
    state.isExtensionValid = false;
    state.isInitialized = false;
  } finally {
    state.isInitializing = false;
  }
}

/**
 * 檢查擴展上下文是否有效
 * @returns {Promise<boolean>} - 上下文是否有效
 */
async function checkExtensionContext() {
  try {
    const result = await safeChromeCall((callback) => {
      chrome.storage.local.get([], () => callback(true));
    });
    return result !== null;
  } catch (error) {
    return false;
  }
}

/**
 * 設置所有必要的事件監聽器
 */
async function setupEventListeners() {
  if (eventListenersConfigured) {
    return;
  }

  // 添加消息監聽器
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 監聽頁面生命週期事件
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('popstate', handlePopState);
  
  // 設置 URL 變化檢查定時器
  urlCheckIntervalId = setInterval(checkUrlChange, config.EXTENSION_CHECK_INTERVAL);
  eventListenersConfigured = true;
}

// =============================================================================
// 消息處理系統
// =============================================================================

/**
 * 處理來自 popup 和背景腳本的消息
 * @param {Object} request - 消息請求對象
 * @param {Object} sender - 消息發送者信息
 * @param {Function} sendResponse - 回應函數
 * @returns {boolean} - 是否保持消息通道開放
 */
function handleMessage(request, sender, sendResponse) {
  try {
    // 驗證消息格式
    if (!request || typeof request !== 'object') {
      console.warn('FocusCut: Received invalid message');
      sendResponse({ status: 'error', message: 'Invalid message' });
      return true;
    }
    
    console.log('FocusCut: Content script received message:', request.action);
    
    // 處理各種指令
    switch(request.action) {
      case 'addDivider':
        addDivider(request.color);
        sendResponse({ status: 'success' });
        break;
      
      case 'addBlock':
        addBlock(request.color);
        sendResponse({ status: 'success' });
        break;
      
      case 'addNote':
        addNote(request.color);
        sendResponse({ status: 'success' });
        break;
      
      case 'clearAll':
        clearAllUserElements()
          .then(() => sendResponse({ status: 'success' }))
          .catch(error => {
            console.error('FocusCut: Failed to clear all elements:', error);
            sendResponse({ status: 'error', message: error.message });
          });
        break;
      
      case 'rescan':
        resetElements();
        initializeExtension();
        sendResponse({ status: 'success' });
        break;
      
      case 'reinitialize':
        console.log('FocusCut: Reinitializing extension...');
        resetElements();
        setTimeout(() => {
          initializeExtension();
        }, 100);
        sendResponse({ status: 'success' });
        break;

      case 'pageUpdated':
      case 'tabActivated':
        handleUrlChange(request.url || window.location.href);
        sendResponse({ status: 'success' });
        break;
      
      case 'enableHighlighter':
        enableHighlighter(request.color);
        sendResponse({ status: 'success' });
        break;
      
      case 'toggleReadingMask':
        if (!isMaskActive) {
          // 創建遮色片時應用選定樣式
          createReadingMaskWithStyle(request.maskStyle);
          sendResponse({ status: 'success', isVisible: true });
        } else {
          removeReadingMask();
          sendResponse({ status: 'success', isVisible: false });
        }
        break;
      
      case 'checkReadingMaskStatus':
        console.log('FocusCut: Checking reading mask status, active:', isMaskActive);
        sendResponse({ status: 'success', isVisible: isMaskActive });
        break;
      
      case 'updateReadingMaskStyle':
        if (isMaskActive && request.maskStyle) {
          console.log('FocusCut: Updating reading mask style:', request.maskStyle);
          updateMaskStyle(request.maskStyle);
          sendResponse({ status: 'success' });
        } else {
          sendResponse({ status: 'error', message: 'Reading mask not active or no style provided' });
        }
        break;
      
      case 'toggleHighlighterBox':
        if (isHighlighterBoxVisible) {
          // 如果當前顯示，就隱藏
          console.log('FocusCut: Hiding highlighter box');
          const penBox = document.getElementById('focuscut-pen-box');
          if (penBox) {
            penBox.style.display = 'none';
          }
          isHighlighterBoxVisible = false;
          
          // 清除螢光筆盒狀態
          state.elements.highlighterBox = null;
          saveElements();
          
          sendResponse({ status: 'success', isVisible: false });
        } else {
          // 如果當前隱藏，就顯示
          console.log('FocusCut: Showing highlighter box');
          let penBox = document.getElementById('focuscut-pen-box');
          if (!penBox) {
            // 如果不存在就創建
            createHighlighterToolbox();
            penBox = document.getElementById('focuscut-pen-box');
          }
          if (penBox) {
            penBox.style.display = 'flex';
            isHighlighterBoxVisible = true;
            
            // 保存螢光筆盒狀態
            state.elements.highlighterBox = {
              isVisible: true
            };
            saveElements();
            
            sendResponse({ status: 'success', isVisible: true });
          } else {
            console.error('FocusCut: Failed to create highlighter box');
            sendResponse({ status: 'error', message: 'Failed to create highlighter box' });
          }
        }
        break;
      
      case 'checkHighlighterBoxStatus':
        console.log('FocusCut: Checking highlighter box status, visible:', isHighlighterBoxVisible);
        sendResponse({ status: 'success', isVisible: isHighlighterBoxVisible });
        break;
      
      default:
        sendResponse({ status: 'error', message: 'Unknown action' });
        break;
    }
    
    return true; // 保持消息通道開放以支持異步響應
  } catch (error) {
    console.error('FocusCut: Error handling message:', error);
    sendResponse({ status: 'error', message: error.message });
    return true; // 保持消息通道開放
  }
}

// 新增：使用指定樣式創建遮色片
function createReadingMaskWithStyle(maskStyle) {
  console.log('FocusCut: Creating reading mask with style:', maskStyle);
  
  // 先移除現有的遮色片
  removeReadingMask(false);
  
  // 創建上遮色片
  readingMaskTop = document.createElement('div');
  readingMaskTop.className = 'focuscut-reading-mask-top';
  readingMaskTop.style.height = topMaskHeight + 'px'; // 使用變量
  
  // 應用樣式
  readingMaskTop.style.backgroundColor = maskStyle.color || 'rgba(120, 120, 120, 0.4)';
  if (maskStyle.blur) {
    readingMaskTop.style.backdropFilter = 'blur(4px)';
    readingMaskTop.style.WebkitBackdropFilter = 'blur(4px)';
  } else {
    readingMaskTop.style.backdropFilter = 'none';
    readingMaskTop.style.WebkitBackdropFilter = 'none';
  }
  
  // 創建上邊緣調整器
  const topEdge = document.createElement('div');
  topEdge.className = 'focuscut-reading-mask-edge focuscut-reading-mask-edge-bottom';
  topEdge.style.cursor = 'ns-resize';
  topEdge.addEventListener('mousedown', (e) => initMaskResize(e, true));
  
  readingMaskTop.appendChild(topEdge);
  
  // 創建下遮色片
  readingMaskBottom = document.createElement('div');
  readingMaskBottom.className = 'focuscut-reading-mask-bottom';
  readingMaskBottom.style.height = bottomMaskHeight + 'px'; // 使用變量
  
  // 應用樣式
  readingMaskBottom.style.backgroundColor = maskStyle.color || 'rgba(120, 120, 120, 0.4)';
  if (maskStyle.blur) {
    readingMaskBottom.style.backdropFilter = 'blur(4px)';
    readingMaskBottom.style.WebkitBackdropFilter = 'blur(4px)';
  } else {
    readingMaskBottom.style.backdropFilter = 'none';
    readingMaskBottom.style.WebkitBackdropFilter = 'none';
  }
  
  // 創建下邊緣調整器
  const bottomEdge = document.createElement('div');
  bottomEdge.className = 'focuscut-reading-mask-edge focuscut-reading-mask-edge-top';
  bottomEdge.style.cursor = 'ns-resize';
  bottomEdge.addEventListener('mousedown', (e) => initMaskResize(e, false));
  
  readingMaskBottom.appendChild(bottomEdge);
  
  // 創建控制面板
  readingMaskControls = document.createElement('div');
  readingMaskControls.className = 'focuscut-reading-mask-controls';
  
  // TODO: 未來功能 - 建立遮色片選色器
  // createMaskColorPicker(readingMaskControls, maskStyle);
  
  // 關閉按鈕
  const closeButton = document.createElement('button');
  closeButton.className = 'focuscut-mask-close-btn';
  closeButton.title = chrome.i18n.getMessage('closeReadingMask') || '關閉遮色片';
  
  // 創建白色 SVG 叉叉圖示
  const closeIcon = document.createElement('div');
  closeIcon.className = 'focuscut-close-icon';
  closeButton.appendChild(closeIcon);
  
  closeButton.addEventListener('click', () => {
    removeReadingMask();
  });
  
  readingMaskControls.appendChild(closeButton);
  
  // 添加到頁面
  document.body.appendChild(readingMaskTop);
  document.body.appendChild(readingMaskBottom);
  document.body.appendChild(readingMaskControls);
  
  // 位置遮色片
  positionMasks();
  
  // 設置活躍狀態
  isMaskActive = true;
  
  // 保存遮色片狀態
  state.elements.readingMask = {
    isActive: true,
    style: maskStyle,
    topHeight: topMaskHeight,
    bottomHeight: bottomMaskHeight
  };
  
  // 保存到存儲
  saveElements();
  
  console.log('FocusCut: Reading mask created and saved');
}

// TODO: 未來功能 - 創建遮色片選色器  
/*
function createMaskColorPicker(container, currentStyle) {
  // 創建選色器容器
  const colorPicker = document.createElement('div');
  colorPicker.className = 'focuscut-mask-color-picker';
  
  // 遮色片顏色選項（與popup中的一致）
  const maskColors = [
    { style: 'white-blur', color: 'rgba(245, 245, 245, 0.4)', displayColor: '#F5F5F5', name: '白色模糊' },
    { style: 'light-blur-gray', color: 'rgba(211, 211, 211, 0.4)', displayColor: '#E5E5E5', name: '淺灰模糊' },
    { style: 'dark-blur-gray', color: 'rgba(100, 100, 100, 0.4)', displayColor: '#A0A0A0', name: '深灰模糊' }
  ];
  
  // 確保 currentStyle 有 style 屬性，否則使用預設值
  if (!currentStyle.style) {
    currentStyle.style = 'white-blur';
  }
  
  // 找到當前樣式對應的顏色
  const currentColor = maskColors.find(color => color.style === currentStyle.style) || maskColors[0];
  
  // 創建當前顏色指示器
  const currentIndicator = document.createElement('div');
  currentIndicator.className = 'focuscut-mask-color-current';
  currentIndicator.style.backgroundColor = currentColor.displayColor;
  currentIndicator.title = '點擊選擇遮色片顏色';
  
  // 根據背景顏色添加特殊class
  if (currentColor.style === 'white-blur') {
    currentIndicator.classList.add('white-background');
  } else if (currentColor.style === 'light-blur-gray') {
    currentIndicator.classList.add('light-gray-background');
  } else if (currentColor.style === 'dark-blur-gray') {
    currentIndicator.classList.add('dark-gray-background');
  }
  
  // 創建選項容器
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'focuscut-mask-color-options';
  
  maskColors.forEach(colorData => {
    const colorBtn = document.createElement('div');
    colorBtn.className = 'focuscut-mask-color-btn';
    colorBtn.title = colorData.name;
    colorBtn.style.backgroundColor = colorData.displayColor;
    colorBtn.setAttribute('data-style', colorData.style);
    colorBtn.setAttribute('data-color', colorData.color);
    
    // 設置當前選中樣式
    if (currentStyle.style === colorData.style) {
      colorBtn.classList.add('active');
    }
    
    colorBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('FocusCut: Changing mask color to:', colorData.style);
      
      // 移除所有活躍狀態
      optionsContainer.querySelectorAll('.focuscut-mask-color-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 設置當前按鈕為活躍
      colorBtn.classList.add('active');
      
      // 更新當前顏色指示器
      currentIndicator.style.backgroundColor = colorData.displayColor;
      
      // 更新背景顏色的特殊class
      currentIndicator.classList.remove('white-background', 'light-gray-background', 'dark-gray-background');
      if (colorData.style === 'white-blur') {
        currentIndicator.classList.add('white-background');
      } else if (colorData.style === 'light-blur-gray') {
        currentIndicator.classList.add('light-gray-background');
      } else if (colorData.style === 'dark-blur-gray') {
        currentIndicator.classList.add('dark-gray-background');
      }
      
      // 更新遮色片樣式
      const newStyle = {
        style: colorData.style,
        color: colorData.color,
        blur: true
      };
      
      updateMaskStyle(newStyle);
    });
    
    optionsContainer.appendChild(colorBtn);
  });
  
  // 組裝選色器
  colorPicker.appendChild(currentIndicator);
  colorPicker.appendChild(optionsContainer);
  
  // 將選色器插入到關閉按鈕之前
  container.insertBefore(colorPicker, container.firstChild);
}
*/

// 更新遮色片樣式
function updateMaskStyle(newStyle) {
  if (!readingMaskTop || !readingMaskBottom) return;
  
  // 更新上遮色片樣式
  readingMaskTop.style.backgroundColor = newStyle.color;
  if (newStyle.blur) {
    readingMaskTop.style.backdropFilter = 'blur(4px)';
    readingMaskTop.style.WebkitBackdropFilter = 'blur(4px)';
  } else {
    readingMaskTop.style.backdropFilter = 'none';
    readingMaskTop.style.WebkitBackdropFilter = 'none';
  }
  
  // 更新下遮色片樣式
  readingMaskBottom.style.backgroundColor = newStyle.color;
  if (newStyle.blur) {
    readingMaskBottom.style.backdropFilter = 'blur(4px)';
    readingMaskBottom.style.WebkitBackdropFilter = 'blur(4px)';
  } else {
    readingMaskBottom.style.backdropFilter = 'none';
    readingMaskBottom.style.WebkitBackdropFilter = 'none';
  }
  
  // 更新狀態
  if (state.elements.readingMask) {
    state.elements.readingMask.style = newStyle;
    saveElements();
  }
  
  console.log('FocusCut: Mask style updated to:', newStyle);
}

// 存儲操作
function createEmptyElementsState() {
  return {
    dividers: [],
    blocks: [],
    notes: [],
    highlights: [],
    readingMask: null,
    highlighterBox: null
  };
}

function normalizeElementsData(data) {
  return {
    dividers: Array.isArray(data?.dividers) ? data.dividers : [],
    blocks: Array.isArray(data?.blocks) ? data.blocks : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
    highlights: Array.isArray(data?.highlights) ? data.highlights : [],
    readingMask: data?.readingMask || null,
    highlighterBox: data?.highlighterBox || null
  };
}

function getPageStorageKey(pageKey) {
  return `${config.STORAGE_PREFIX}${pageKey}`;
}

function chromeStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result || {});
      }
    });
  });
}

function chromeStorageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

function chromeStorageRemove(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

function isExtensionContextInvalidatedError(error) {
  return error?.message?.includes('Extension context invalidated') ||
    error?.message?.includes('Extension context was invalidated');
}

async function clearAllUserElements() {
  const pageKey = getCurrentPageKey();
  const storageKey = getPageStorageKey(pageKey);

  state.isClearing = true;
  try {
    if (state.highlighter.isActive) {
      disableHighlighter();
    }
    if (state.eraser.isActive) {
      disableEraser();
    }

    await clearAllElements();
    state.elements = createEmptyElementsState();

    // 等待先前已排入的儲存完成，再移除 key，避免舊寫入稍後讓資料復活。
    await storageWriteQueue.catch(error => {
      console.warn('FocusCut: Previous storage write failed before clear:', error);
    });

    // 即使擴充功能儲存暫時無法使用，也先清掉網站上殘留的舊版副本。
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('FocusCut: Could not remove legacy localStorage data:', error);
    }

    if (!state.isExtensionValid) {
      throw new Error('Chrome extension storage is unavailable');
    }

    await chromeStorageRemove([storageKey, pageKey]);

    console.log('FocusCut: Cleared all elements and persisted data for current page');
  } finally {
    state.isClearing = false;
  }
}

async function saveElements(pageKey = getCurrentPageKey()) {
  if (!state.isInitialized || state.isRestoring || state.isClearing || !state.isExtensionValid) {
    return;
  }

  // 在排入佇列前建立快照，避免後續狀態修改污染較早的寫入。
  const storageKey = getPageStorageKey(pageKey);
  const dataSnapshot = JSON.parse(JSON.stringify(state.elements));

  storageWriteQueue = storageWriteQueue
    .catch(() => undefined)
    .then(() => chromeStorageSet({ [storageKey]: dataSnapshot }));

  try {
    await storageWriteQueue;
    console.log('FocusCut: Saved to Chrome storage');
    return true;
  } catch (error) {
    state.isExtensionValid = false;
    if (!isExtensionContextInvalidatedError(error)) {
      console.error('FocusCut: Failed to save to Chrome storage:', error);
    }
    return false;
  }
}

async function migrateLegacyPageData(pageKey, storageData) {
  const storageKey = getPageStorageKey(pageKey);
  const legacyChromeData = storageData[pageKey];
  const legacyLocalStorageKey = storageKey;
  let legacyLocalData = null;

  try {
    const serializedData = localStorage.getItem(legacyLocalStorageKey);
    if (serializedData) {
      legacyLocalData = JSON.parse(serializedData);
    }
  } catch (error) {
    console.warn('FocusCut: Could not read legacy localStorage data:', error);
  }

  // 舊版明確以 localStorage 為主要來源，Chrome Storage 僅為非同步備份。
  // 兩者並存時優先遷移 localStorage，避免較舊備份覆蓋最後的編輯。
  const dataToMigrate = legacyLocalData || legacyChromeData;
  if (!dataToMigrate) {
    return null;
  }

  // 先寫入擴充功能專用空間，成功後才刪除舊資料。
  await chromeStorageSet({ [storageKey]: dataToMigrate });

  if (legacyChromeData) {
    try {
      await chromeStorageRemove([pageKey]);
    } catch (error) {
      console.warn('FocusCut: Could not remove legacy Chrome storage key:', error);
    }
  }

  try {
    localStorage.removeItem(legacyLocalStorageKey);
  } catch (error) {
    console.warn('FocusCut: Could not remove migrated localStorage data:', error);
  }

  console.log('FocusCut: Migrated legacy page data to Chrome storage');
  return dataToMigrate;
}

// 載入元素，Chrome Storage 是唯一的正式資料來源。
async function loadSavedElements() {
  const pageKey = getCurrentPageKey();
  const storageKey = getPageStorageKey(pageKey);

  if (!state.isExtensionValid) {
    throw new Error('Chrome extension storage is unavailable');
  }

  let storageData;
  try {
    // 同時讀取新版前綴 key 與舊版原始 URL key，供無損遷移使用。
    storageData = await chromeStorageGet([storageKey, pageKey]);
  } catch (error) {
    state.isExtensionValid = false;
    throw error;
  }

  let data = storageData[storageKey] || null;
  if (!data) {
    data = await migrateLegacyPageData(pageKey, storageData);
  } else {
    // 新版資料已存在時，刪除網站上可能殘留的舊副本。
    if (storageData[pageKey]) {
      try {
        await chromeStorageRemove([pageKey]);
      } catch (error) {
        console.warn('FocusCut: Could not remove legacy Chrome storage key:', error);
      }
    }
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('FocusCut: Could not remove stale localStorage data:', error);
    }
  }

  state.elements = data ? normalizeElementsData(data) : createEmptyElementsState();

  state.isRestoring = true;
  try {
    await createElementsFromData(state.elements);
  } finally {
    state.isRestoring = false;
  }

  if (!data) {
    console.log('FocusCut: No saved elements found');
  }
}

// 從數據創建元素
async function createElementsFromData(elementsData) {
  try {
    // 清除現有元素
    await clearAllElements();
    await waitForDocumentBody();
    
    // 創建分隔線
    if (elementsData.dividers.length > 0) {
      for (let i = 0; i < elementsData.dividers.length; i++) {
        try {
          await createDivider(elementsData.dividers[i]);
        } catch (dividerError) {
          console.error('FocusCut: Error creating divider:', dividerError);
        }
      }
    }
    
    // 創建色卡
    if (elementsData.blocks.length > 0) {
      for (let i = 0; i < elementsData.blocks.length; i++) {
        try {
          await createBlock(elementsData.blocks[i]);
        } catch (blockError) {
          console.error('FocusCut: Error creating block:', blockError);
        }
      }
    }
    
    // 創建便利貼
    if (elementsData.notes.length > 0) {
      for (let i = 0; i < elementsData.notes.length; i++) {
        try {
          await createNote(elementsData.notes[i]);
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
    
    // 新增: 恢復遮色片
    if (elementsData.readingMask && elementsData.readingMask.isActive) {
      try {
        const savedReadingMask = elementsData.readingMask;
        console.log('FocusCut: Restoring reading mask:', savedReadingMask);
        
        // 先設置保存的高度到全域變數
        if (savedReadingMask.topHeight) {
          topMaskHeight = savedReadingMask.topHeight;
        }
        if (savedReadingMask.bottomHeight) {
          bottomMaskHeight = savedReadingMask.bottomHeight;
        }
        
        // 創建遮色片 - 確保傳入完整的樣式對象
        const maskStyle = savedReadingMask.style || {
          style: 'white-blur',
          color: 'rgba(245, 245, 245, 0.4)',
          blur: true
        };
        createReadingMaskWithStyle(maskStyle);
        
        // 再次確保高度正確（防止被重置）
        if (readingMaskTop && savedReadingMask.topHeight) {
          readingMaskTop.style.height = savedReadingMask.topHeight + 'px';
        }
        if (readingMaskBottom && savedReadingMask.bottomHeight) {
          readingMaskBottom.style.height = savedReadingMask.bottomHeight + 'px';
        }
        
        positionMasks();
      } catch (maskError) {
        console.error('FocusCut: Error restoring reading mask:', maskError);
      }
    }
    
    // 新增: 恢復螢光筆盒
    if (elementsData.highlighterBox && elementsData.highlighterBox.isVisible) {
      try {
        console.log('FocusCut: Restoring highlighter box');
        
        // 創建螢光筆盒
        let penBox = document.getElementById('focuscut-pen-box');
        if (!penBox) {
          createHighlighterToolbox();
          penBox = document.getElementById('focuscut-pen-box');
        }
        
        if (penBox) {
          penBox.style.display = 'flex';
          isHighlighterBoxVisible = true;
          console.log('FocusCut: Highlighter box restored successfully');
        }
      } catch (highlighterError) {
        console.error('FocusCut: Error restoring highlighter box:', highlighterError);
      }
    }
    
    console.log('FocusCut: Successfully created elements');
  } catch (error) {
    console.error('FocusCut: Error creating elements:', error);
    await clearAllElements();
    state.elements = createEmptyElementsState();
    throw error;
  }
}

// 重置元素和狀態
function resetElements() {
  console.log('FocusCut: Resetting all elements and state');
  
  // 重置狀態
  state.isInitialized = false;
  state.isExtensionValid = false;
  state.initRetryCount = 0;
  
  // 重置螢光筆和橡皮擦狀態
  if (state.highlighter.isActive) {
    disableHighlighter();
  }
  if (state.eraser && state.eraser.isActive) {
    disableEraser();
  }
  
  // 清空所有元素陣列
  state.elements = createEmptyElementsState();
  
  // 移除頁面上的所有元素
  clearAllElements();
  
  // 移除螢光筆工具箱
  const penBox = document.getElementById('focuscut-pen-box');
  if (penBox) {
    penBox.remove();
  }
  
  // 重置螢光筆盒狀態
  isHighlighterBoxVisible = false;
  
  // 重置遮色片狀態
  isMaskActive = false;
  
  console.log('FocusCut: Reset completed');
}

// URL 變化處理
async function handleUrlChange(newUrl = window.location.href) {
  if (state.currentUrl === newUrl || state.isNavigating || !state.isInitialized) {
    return;
  }
  
  const previousUrl = state.currentUrl;
  state.isNavigating = true;
  console.log('FocusCut: URL changed from', previousUrl, 'to', newUrl);
  
  try {
    // 確保舊頁面最後一次狀態寫入完成，再切換儲存 key。
    await saveElements(previousUrl);
    state.currentUrl = newUrl;

    if (state.highlighter.isActive) {
      disableHighlighter();
    }
    if (state.eraser.isActive) {
      disableEraser();
    }

    await clearAllElements();
    state.elements = createEmptyElementsState();
    await loadSavedElements();
  } catch (error) {
    console.error('FocusCut: Error handling URL change:', error);
  } finally {
    state.isNavigating = false;

    // 導航期間若網址又改變，繼續處理最新網址。
    if (state.currentUrl !== window.location.href) {
      handleUrlChange(window.location.href);
    }
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

// 清除頁面上的所有元素
function clearAllElements() {
  return new Promise((resolve) => {
    const focuscutElements = document.querySelectorAll('.focuscut-divider, .focuscut-block, .focuscut-sticky-note, .focuscut-highlighter, .focuscut-reading-mask-top, .focuscut-reading-mask-bottom, .focuscut-reading-mask-controls, #focuscut-pen-box');
    console.log('FocusCut: Clearing', focuscutElements.length, 'existing elements');
    
    focuscutElements.forEach(el => {
      el.remove();
    });

    readingMaskTop = null;
    readingMaskBottom = null;
    readingMaskControls = null;
    isMaskActive = false;
    isHighlighterBoxVisible = false;
    window.removeEventListener('scroll', positionMasks);
    window.removeEventListener('resize', handleResize);
    
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
async function createDivider(dividerData) {
  const pageBody = await waitForDocumentBody();
  return new Promise((resolve) => {
    const divider = document.createElement('div');
    divider.className = 'focuscut-divider';
    divider.style.backgroundColor = dividerData.color;
    divider.style.position = 'absolute';
    divider.style.left = dividerData.position.x + 'px';
    divider.style.top = dividerData.position.y + 'px';
    divider.style.width = (dividerData.width || '100%');
    
    const deleteButton = document.createElement('div');
    deleteButton.className = 'focuscut-delete-button';
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
    
    pageBody.appendChild(divider);
    resolve(divider);
  });
}

// 創建色卡
async function createBlock(blockData) {
  const pageBody = await waitForDocumentBody();
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
    
    // 如果是固定狀態，添加自定義屬性
    if (blockData.fixed) {
      block.setAttribute('data-fixed', 'true');
    }
    
    // 添加刪除按鈕
    const deleteButton = document.createElement('div');
    deleteButton.className = 'focuscut-delete-button';
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
    
    pageBody.appendChild(block);
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
        } else if (typeof data.height !== 'undefined') {
          data.height = newHeight + 'px';
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
async function createNote(noteData) {
  const pageBody = await waitForDocumentBody();
  return new Promise((resolve) => {
    const note = document.createElement('div');
    note.className = 'focuscut-sticky-note';
    
    // 設置初始樣式和位置，支援鎖定功能
    note.style.position = noteData.fixed ? 'fixed' : 'absolute';
    note.style.left = noteData.position.x + 'px';
    note.style.top = noteData.position.y + 'px';
    note.style.width = (noteData.width || '250px');
    note.style.height = (noteData.height || 'auto');
    note.style.backgroundColor = noteData.color || '#f8f0cc';
    note.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)'; // 輕微陰影替代邊框
    note.style.border = 'none'; // 移除邊框
    note.style.borderRadius = '2px'; // 保持輕微圓角
    
    // 如果是固定狀態，添加自定義屬性
    if (noteData.fixed) {
      note.setAttribute('data-fixed', 'true');
    }
    
    // 添加刪除按鈕
    const deleteButton = document.createElement('div');
    deleteButton.className = 'focuscut-delete-button';
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      note.remove();
      state.elements.notes = state.elements.notes.filter(n => n !== noteData);
      saveElements();
    });
    note.appendChild(deleteButton);
    
    // 添加鎖定/解鎖按鈕 (圓形樣式)
    const lockButton = document.createElement('div');
    lockButton.className = 'focuscut-lock-button';
    
    // 創建鎖圖標
    const lockIcon = document.createElement('div');
    lockIcon.className = 'lock-icon';
    lockButton.appendChild(lockIcon);
    
    lockButton.title = noteData.fixed ? 
      chrome.i18n.getMessage('unlockPosition') || '取消固定 (目前已固定在螢幕上)' : 
      chrome.i18n.getMessage('lockPosition') || '固定在螢幕上 (目前會跟隨頁面滾動)';
    
    // 如果是固定狀態，添加自定義屬性
    if (noteData.fixed) {
      lockButton.setAttribute('data-locked', 'true');
    }
    
    lockButton.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 切換鎖定狀態
      noteData.fixed = !noteData.fixed;
      
      // 更新鎖定按鈕狀態
      if (noteData.fixed) {
        lockButton.setAttribute('data-locked', 'true');
        note.setAttribute('data-fixed', 'true');
      } else {
        lockButton.removeAttribute('data-locked');
        note.removeAttribute('data-fixed');
      }
      
      // 更新提示文字
      lockButton.title = noteData.fixed ? 
        chrome.i18n.getMessage('unlockPosition') || '取消固定 (目前已固定在螢幕上)' : 
        chrome.i18n.getMessage('lockPosition') || '固定在螢幕上 (目前會跟隨頁面滾動)';
      
      // 保存當前滾動位置
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      // 計算絕對位置和相對視窗的固定位置之間的轉換
      const rect = note.getBoundingClientRect();
      
      if (noteData.fixed) {
        // 從絕對位置轉換為固定位置
        note.style.position = 'fixed';
        noteData.position.x = rect.left;
        noteData.position.y = rect.top;
      } else {
        // 從固定位置轉換為絕對位置
        note.style.position = 'absolute';
        noteData.position.x = rect.left + scrollX;
        noteData.position.y = rect.top + scrollY;
      }
      
      // 更新元素位置
      note.style.left = noteData.position.x + 'px';
      note.style.top = noteData.position.y + 'px';
      
      // 保存更改
      saveElements();
    });
    note.appendChild(lockButton);
    
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
    
    pageBody.appendChild(note);
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
        e.target.classList.contains('focuscut-lock-button') ||
        e.target.classList.contains('lock-icon') ||
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
    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;
    
    // 對於固定定位的元素，確保位置不會超出視窗範圍
    if (data.fixed) {
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
    }
    
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
    height: '150px',
    fixed: false  // 默認不鎖定，會隨頁面滾動
  };
  state.elements.notes.push(noteData);
  try {
    await createNote(noteData);
    saveElements();
  } catch (error) {
    console.error('FocusCut: Error adding note:', error);
  }
}

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
    
    // 調整完成後保存狀態
    if (state.elements.readingMask && state.elements.readingMask.isActive) {
      state.elements.readingMask.topHeight = topMaskHeight;
      state.elements.readingMask.bottomHeight = bottomMaskHeight;
      saveElements();
      console.log('FocusCut: Reading mask size updated and saved');
    }
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
  console.log('FocusCut: Enabling highlighter with color:', color);
  
  // 確保橡皮擦模式已關閉
  if (state.eraser && state.eraser.isActive) {
    console.log('FocusCut: Disabling eraser before enabling highlighter');
    disableEraser();
  }
  
  // 如果已經是活躍狀態，只需要更新顏色
  if (state.highlighter.isActive) {
    // 只更新顏色相關的樣式
    updateHighlighterColor(color);
    state.highlighter.color = color;
    console.log('FocusCut: Updated highlighter color to:', color);
    return;
  }
  
  // 設置當前顏色和狀態
  state.highlighter.color = color;
  state.highlighter.isActive = true;
  
  // 應用顏色樣式
  updateHighlighterColor(color);
  
  // 移除可能殘留的橡皮擦事件監聽器
  document.removeEventListener('mousedown', handleEraserMouseDown);
  document.removeEventListener('mousemove', handleEraserMouseMove);
  document.removeEventListener('mouseup', handleEraserMouseUp);
  document.removeEventListener('keydown', handleEraserKeyDown);
  
  // 鼠標按下時開始選擇文字
  document.addEventListener('mousedown', startTextSelection);
  
  // 添加鍵盤事件監聽器，按ESC鍵退出螢光筆模式
  document.addEventListener('keydown', handleHighlighterKeyDown);
  
  console.log('FocusCut: Highlighter enabled with color:', state.highlighter.color);
}

// 更新螢光筆顏色樣式
function updateHighlighterColor(color) {
  // 移除所有顏色的游標樣式
  document.body.classList.remove('focuscut-highlight-cursor', 'yellow', 'green', 'orange', 'red');
  
  // 添加螢光筆游標樣式和對應顏色
  document.body.classList.add('focuscut-highlight-cursor');
  
  // 根據顏色添加對應的CSS類
  switch(color) {
    case '#ffff00':
      document.body.classList.add('yellow');
      break;
    case '#00ff00':
      document.body.classList.add('green');
      break;
    case '#ff8000':
      document.body.classList.add('orange');
      break;
    case '#ff0000':
      document.body.classList.add('red');
      break;
    default:
      document.body.classList.add('yellow'); // 默認黃色
      break;
  }
}

// 關閉螢光筆模式
function disableHighlighter() {
  if (!state.highlighter.isActive) return;
  
  console.log('FocusCut: Disabling highlighter');
  
  state.highlighter.isActive = false;
  
  // 移除螢光筆游標樣式和所有顏色類
  document.body.classList.remove('focuscut-highlight-cursor', 'yellow', 'green', 'orange', 'red', 'focuscut-highlight-selecting');
  
  // 移除事件監聽器
  document.removeEventListener('mousedown', startTextSelection);
  document.removeEventListener('mouseup', handleTextSelection);
  document.removeEventListener('keydown', handleHighlighterKeyDown);
  
  // 清除任何未完成的文字選擇
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
  
  console.log('FocusCut: Highlighter mode disabled, all event listeners removed');
}

// 按ESC退出螢光筆模式
function handleHighlighterKeyDown(e) {
  if (e.key === 'Escape') {
    disableHighlighter();
  }
}

// 開始文字選擇
function startTextSelection(e) {
  console.log('FocusCut: startTextSelection called, highlighter active:', state.highlighter.isActive);
  
  if (!state.highlighter.isActive) {
    console.log('FocusCut: Highlighter not active, ignoring mousedown');
    return;
  }
  
  // 避免在控制元素上啟動
  if (e.target.closest('.focuscut-block, .focuscut-divider, .focuscut-sticky-note, .focuscut-reading-mask-controls, #focuscut-pen-box')) {
    console.log('FocusCut: Clicked on control element, ignoring');
    return;
  }
  
  console.log('FocusCut: Starting text selection');
  
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
  console.log('FocusCut: Creating highlights with color:', color);
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
      console.log('FocusCut: Applied color:', rgba, 'from original:', color);
      
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

// 創建螢光筆工具箱
function createHighlighterToolbox() {
  // 檢查是否已經存在工具箱，避免重複創建
  if (document.getElementById('focuscut-pen-box')) {
    console.log('FocusCut: Highlighter toolbox already exists');
    return;
  }
  
  console.log('FocusCut: Creating highlighter toolbox');
  
  const penBox = document.createElement('div');
  penBox.id = 'focuscut-pen-box';
  penBox.style.display = 'none'; // 默認隱藏，等待用戶主動開啟
  
  // 添加隱形觸發區域（右上角）
  const closeTrigger = document.createElement('div');
  closeTrigger.className = 'focuscut-pen-box-close-trigger';
  penBox.appendChild(closeTrigger);
  
  // 添加關閉按鈕（右上角）
  const closeButton = document.createElement('div');
  closeButton.className = 'focuscut-pen-box-close';
  closeButton.title = '關閉螢光筆盒';
  
  // 創建白色 SVG 叉叉圖示
  const closeIcon = document.createElement('div');
  closeIcon.className = 'focuscut-close-icon';
  closeButton.appendChild(closeIcon);
  
  closeButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('FocusCut: Closing highlighter toolbox');
    
    // 關閉所有模式
    if (state.highlighter.isActive) {
      disableHighlighter();
    }
    if (state.eraser && state.eraser.isActive) {
      disableEraser();
    }
    
    // 隱藏螢光筆盒並更新狀態
    penBox.style.display = 'none';
    isHighlighterBoxVisible = false;
    
    // 清除螢光筆盒狀態
    state.elements.highlighterBox = null;
    saveElements();
  });
  
  penBox.appendChild(closeButton);
  
  // 在最上面加入游標按鈕（退出功能）
  const cursorBtn = document.createElement('div');
  cursorBtn.className = 'focuscut-cursor-btn';
  cursorBtn.title = '退出螢光筆/橡皮擦模式';
  
  // 使用SVG游標圖示 - 使用Adobe Illustrator設計的精緻版本（放大70%）
  cursorBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 28 28">
    <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 "/>
    <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 "/>
    <rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8"/>
    <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 "/>
  </svg>`;
  
  cursorBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('FocusCut: Cursor button clicked - exiting all modes');
    
    // 關閉所有模式
    if (state.highlighter.isActive) {
      disableHighlighter();
    }
    if (state.eraser && state.eraser.isActive) {
      disableEraser();
    }
    
    // 移除所有活躍狀態
    penBox.querySelectorAll('.focuscut-highlighter-pen, .focuscut-eraser-pen, .focuscut-cursor-btn').forEach(p => p.classList.remove('active'));
  });
  
  penBox.appendChild(cursorBtn);

  // 創建螢光筆顏色（順序：黃橙綠）
  const colors = [
    { color: '#ffff00', name: '黃色', class: 'yellow' },
    { color: '#ff8000', name: '橙色', class: 'orange' },
    { color: '#00ff00', name: '綠色', class: 'green' }
  ];
  
  colors.forEach(colorData => {
    const pen = document.createElement('div');
    pen.className = 'focuscut-highlighter-pen';
    pen.title = `螢光筆 - ${colorData.name}`;
    pen.setAttribute('data-color', colorData.color);
    pen.setAttribute('data-color-class', colorData.class);
    
    // 使用跟游標一樣的SVG圖示
    pen.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 32 32">
      <path d="M22,2L10,14L8,24L18,22L30,10L22,2z" stroke="black" stroke-width="2" fill="${colorData.color}"/>
    </svg>`;
    
    pen.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('FocusCut: Highlighter pen clicked:', colorData.color);
      
      // 立即更新視覺狀態
      penBox.querySelectorAll('.focuscut-highlighter-pen, .focuscut-eraser-pen').forEach(p => p.classList.remove('active'));
      
      // 檢查是否已經是當前顏色且處於活躍狀態
      if (state.highlighter.isActive && state.highlighter.color === colorData.color) {
        // 關閉螢光筆
        disableHighlighter();
      } else {
        // 關閉橡皮擦（如果活躍）
        if (state.eraser && state.eraser.isActive) {
          disableEraser();
          // 移除橡皮擦的活躍狀態
          penBox.querySelectorAll('.focuscut-eraser-pen').forEach(p => p.classList.remove('active'));
        }
        
        // 立即設置新顏色和狀態
        state.highlighter.color = colorData.color;
        
        // 啟用螢光筆
        enableHighlighter(colorData.color);
        
        // 設置活躍狀態
        pen.classList.add('active');
      }
    });
    
    penBox.appendChild(pen);
  });
  
  // 添加橡皮擦功能
  const eraser = document.createElement('div');
  eraser.className = 'focuscut-eraser-pen';
  eraser.title = '橡皮擦 - 清除螢光筆標記';
  
  // 使用SVG橡皮擦圖示 - 跟橡皮擦游標一樣的設計（放大70%）
  eraser.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 200 200">
    <g transform="rotate(-45 100 100)">
      <rect x="30" y="70" width="140" height="60" rx="15" ry="15" fill="white" stroke="black" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="72" y1="70" x2="72" y2="130" stroke="black" stroke-width="10" stroke-linecap="round"/>
    </g>
  </svg>`;
  
  eraser.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('FocusCut: Eraser clicked');
    
    // 立即更新視覺狀態
    penBox.querySelectorAll('.focuscut-highlighter-pen, .focuscut-eraser-pen').forEach(p => p.classList.remove('active'));
    
    // 如果橡皮擦已經是活躍狀態，則關閉
    if (state.eraser && state.eraser.isActive) {
      disableEraser();
    } else {
      // 關閉螢光筆模式
      if (state.highlighter.isActive) {
        disableHighlighter();
      }
      // 啟用橡皮擦模式
      enableEraser();
      eraser.classList.add('active');
    }
  });
  
  penBox.appendChild(eraser);
  
  document.body.appendChild(penBox);
  console.log('FocusCut: Highlighter toolbox created and added to DOM');
}

// 啟用橡皮擦模式
function enableEraser() {
  console.log('FocusCut: Enabling eraser mode');
  
  // 確保螢光筆模式已關閉
  if (state.highlighter.isActive) {
    console.log('FocusCut: Disabling highlighter before enabling eraser');
    disableHighlighter();
  }
  
  // 如果已經是活躍狀態，先關閉
  if (state.eraser.isActive) {
    disableEraser();
  }
  
  state.eraser.isActive = true;
  state.eraser.isDragging = false; // 新增拖曳狀態
  
  // 添加橡皮擦游標樣式
  document.body.classList.add('focuscut-eraser-cursor');
  
  // 移除可能殘留的螢光筆事件監聽器
  document.removeEventListener('mousedown', startTextSelection);
  document.removeEventListener('keydown', handleHighlighterKeyDown);
  
  // 鼠標事件處理
  document.addEventListener('mousedown', handleEraserMouseDown);
  document.addEventListener('mousemove', handleEraserMouseMove);
  document.addEventListener('mouseup', handleEraserMouseUp);
  
  // 添加鍵盤事件監聽器，按ESC鍵退出橡皮擦模式
  document.addEventListener('keydown', handleEraserKeyDown);
  
  console.log('FocusCut: Eraser mode enabled');
}

// 關閉橡皮擦模式
function disableEraser() {
  if (!state.eraser.isActive) return;
  
  console.log('FocusCut: Disabling eraser mode');
  
  state.eraser.isActive = false;
  state.eraser.isDragging = false;
  
  // 移除橡皮擦游標樣式
  document.body.classList.remove('focuscut-eraser-cursor');
  
  // 完全恢復文字選取功能
  document.body.style.removeProperty('user-select');
  document.body.style.removeProperty('-webkit-user-select');
  document.body.style.removeProperty('-moz-user-select');
  document.body.style.removeProperty('-ms-user-select');
  
  // 移除事件監聽器
  document.removeEventListener('mousedown', handleEraserMouseDown);
  document.removeEventListener('mousemove', handleEraserMouseMove);
  document.removeEventListener('mouseup', handleEraserMouseUp);
  document.removeEventListener('keydown', handleEraserKeyDown);
  
  console.log('FocusCut: Eraser mode disabled, all event listeners removed');
}

// 處理橡皮擦鼠標按下事件
function handleEraserMouseDown(e) {
  // 避免在控制元素上啟動
  if (e.target.closest('.focuscut-block, .focuscut-divider, .focuscut-sticky-note, .focuscut-reading-mask-controls, #focuscut-pen-box')) {
    return;
  }
  
  // 防止文字選取和預設行為
  e.preventDefault();
  e.stopPropagation();
  
  state.eraser.isDragging = true;
  
  // 禁用文字選取
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.mozUserSelect = 'none';
  document.body.style.msUserSelect = 'none';
  
  eraseHighlightAtPosition(e.clientX + window.scrollX, e.clientY + window.scrollY);
}

// 處理橡皮擦鼠標移動事件
function handleEraserMouseMove(e) {
  if (!state.eraser.isDragging) return;
  
  // 防止預設行為
  e.preventDefault();
  e.stopPropagation();
  
  // 避免在控制元素上操作
  if (e.target.closest('.focuscut-block, .focuscut-divider, .focuscut-sticky-note, .focuscut-reading-mask-controls, #focuscut-pen-box')) {
    return;
  }
  
  eraseHighlightAtPosition(e.clientX + window.scrollX, e.clientY + window.scrollY);
}

// 處理橡皮擦鼠標抬起事件
function handleEraserMouseUp(e) {
  if (state.eraser.isDragging) {
    e.preventDefault();
    e.stopPropagation();
    
    state.eraser.isDragging = false;
    
    // 恢復文字選取
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.mozUserSelect = '';
    document.body.style.msUserSelect = '';
  }
}

// 在指定位置擦除螢光筆標記
function eraseHighlightAtPosition(x, y) {
  // 查找所有螢光筆元素
  const highlights = document.querySelectorAll('.focuscut-highlighter');
  
  highlights.forEach(highlight => {
    const rect = highlight.getBoundingClientRect();
    const highlightX = rect.left + window.scrollX;
    const highlightY = rect.top + window.scrollY;
    
    // 檢查位置是否在螢光筆標記範圍內
    if (x >= highlightX && x <= highlightX + rect.width &&
        y >= highlightY && y <= highlightY + rect.height) {
      
      console.log('FocusCut: Erasing highlight at', x, y);
      
      // 從DOM中移除
      highlight.remove();
      
      // 從狀態中移除（根據位置匹配）
      state.elements.highlights = state.elements.highlights.filter(h => {
        return !(Math.abs(h.position.x - highlightX) < 5 && 
                Math.abs(h.position.y - highlightY) < 5);
      });
      
      // 保存更新後的狀態
      saveElements();
    }
  });
}

// 按ESC退出橡皮擦模式
function handleEraserKeyDown(e) {
  if (e.key === 'Escape') {
    disableEraser();
    // 移除工具箱中的活躍狀態
    const penBox = document.getElementById('focuscut-pen-box');
    if (penBox) {
      penBox.querySelectorAll('.focuscut-eraser-pen').forEach(p => p.classList.remove('active'));
    }
  }
}

// 啟動初始化
initializeExtension();

 
