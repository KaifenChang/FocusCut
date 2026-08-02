/**
 * FocusCut Popup Script
 * =========================
 * 
 * 功能說明：
 * - 管理彈窗介面的所有互動功能
 * - 處理顏色選擇和預設色票
 * - 與 content script 通信執行功能
 * - 管理遮色片和螢光筆盒的狀態
 * 
 * 作者：KXii
 * 版本：v1.3
 */

// =============================================================================
// 彈窗初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('FocusCut Popup: Loaded');

  const tabMessaging = globalThis.FocusCutTabMessaging;
  const isPreviewMode = ['127.0.0.1', 'localhost'].includes(window.location.hostname) &&
    new URLSearchParams(window.location.search).has('preview');

  function getPopupMessage(key, fallback) {
    try {
      return chrome.i18n.getMessage(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getClearPageCopy() {
    const language = (document.documentElement.lang || '').toLowerCase();
    const readingCardTitle = document.getElementById('reading-card-title')?.textContent || '';
    const isChineseInterface = language.startsWith('zh') || /[\u3400-\u9fff]/.test(readingCardTitle);

    if (isChineseInterface) {
      const isSimplifiedChinese = language.startsWith('zh-cn') || language.startsWith('zh-sg');
      return isSimplifiedChinese
        ? {
            label: '清除此页',
            confirm: '要清除当前页面的所有 FocusCut 内容吗？此操作无法撤销。',
            error: '无法清除此页，请刷新后重试。'
          }
        : {
            label: '清除此頁',
            confirm: '要清除目前頁面的所有 FocusCut 內容嗎？此操作無法復原。',
            error: '無法清除此頁，請重新整理後再試。'
          };
    }

    return {
      label: getPopupMessage('clearCurrentPage', 'Clear this page'),
      confirm: getPopupMessage(
        'clearCurrentPageConfirm',
        'Clear all FocusCut items on this page? This cannot be undone.'
      ),
      error: getPopupMessage(
        'clearCurrentPageError',
        'Unable to clear this page. Please refresh and try again.'
      )
    };
  }
  
  // 獲取所有 DOM 元素
  const errorContainer = document.getElementById('error-container');
  const mainContainer = document.getElementById('main-container');
  const addBlockButton = document.getElementById('addBlock');
  const addNoteButton = document.getElementById('addNote');
  const clearPageButton = document.getElementById('clear-page-button');
  const blockColorInput = document.getElementById('blockColor');
  const noteColorInput = document.getElementById('noteColor');
  const maskColorInput = document.getElementById('maskColor');

  // =============================================================================
  // 遮色片顏色管理
  // =============================================================================

  /**
   * 遮色片樣式設置，使用預設的深灰模糊樣式
   */
  let selectedMaskStyle = {
    style: 'white-blur',
    color: 'rgba(245, 245, 245, 0.4)',
    blur: true
  };

  /**
   * 處理遮色片自訂顏色變更
   */
  maskColorInput.addEventListener('input', async () => {
    const color = maskColorInput.value;
    
    // 將 Hex 顏色轉換為 RGBA 格式
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
    
    // 更新選定的遮色片樣式
    selectedMaskStyle = {
      style: 'custom',
      color: rgbaColor,
      blur: true
    };
    
    // 如果遮色片已開啟，即時更新樣式
    await updateReadingMaskStyle(selectedMaskStyle);
  });

  /**
   * 即時更新遮色片樣式
   * @param {Object} maskStyle - 遮色片樣式對象
   */
  async function updateReadingMaskStyle(maskStyle) {
    try {
      await sendMessageToTab({
        action: 'updateReadingMaskStyle',
        maskStyle
      });
      console.log('Reading mask style updated successfully');
    } catch (error) {
      console.log('Reading mask not active or failed to update:', error.message);
    }
  }

  // =============================================================================
  // 顏色預設管理
  // =============================================================================

  /**
   * 設置一般元素（色卡、便利貼）的預設顏色點擊事件
   * @param {string} presetsId - 預設色票容器的 ID
   * @param {HTMLElement} colorInput - 對應的顏色輸入框
   */
  function setupPresetColors(presetsId, colorInput) {
    const presets = document.getElementById(presetsId);
    if (!presets) return;

    const featureKeys = {
      blockPresets: 'readingCardTitle',
      notePresets: 'noteTitle'
    };
    const featureFallbacks = {
      blockPresets: 'Reading card',
      notePresets: 'Sticky note'
    };
    const featureName = getPopupMessage(featureKeys[presetsId], featureFallbacks[presetsId]);

    presets.querySelectorAll('.color-preset').forEach((preset, index) => {
      const accessibleLabel = `${featureName} ${getPopupMessage('colorOption', 'color option')} ${index + 1}`;
      preset.setAttribute('aria-label', accessibleLabel);
      preset.title = accessibleLabel;
      preset.addEventListener('click', () => {
        // 移除所有 selected class
        presets.querySelectorAll('.color-preset').forEach(p => {
          p.classList.remove('selected');
          p.setAttribute('aria-pressed', 'false');
        });
        
        // 為點擊的色票添加 selected class
        preset.classList.add('selected');
        preset.setAttribute('aria-pressed', 'true');
        
        // 更新顏色輸入框
        const color = preset.getAttribute('data-color');
        colorInput.value = color;
      });
    });
  }

  /**
   * 設置遮色片預設顏色點擊事件
   * @param {string} presetsId - 預設色票容器的 ID
   * @param {HTMLElement} colorInput - 對應的顏色輸入框
   */
  function setupMaskPresetColors(presetsId, colorInput) {
    const presets = document.getElementById(presetsId);
    if (!presets) return;

    const featureName = getPopupMessage('readingMaskTitle', 'Reading mask');
    presets.querySelectorAll('.color-preset').forEach((preset, index) => {
      const accessibleLabel = `${featureName} ${getPopupMessage('colorOption', 'color option')} ${index + 1}`;
      preset.setAttribute('aria-label', accessibleLabel);
      preset.title = accessibleLabel;
      preset.addEventListener('click', async () => {
        // 移除所有 selected class
        presets.querySelectorAll('.color-preset').forEach(p => {
          p.classList.remove('selected');
          p.setAttribute('aria-pressed', 'false');
        });
        
        // 為點擊的色票添加 selected class
        preset.classList.add('selected');
        preset.setAttribute('aria-pressed', 'true');
        
        const color = preset.getAttribute('data-color');
        const style = preset.getAttribute('data-style');
        
        // 更新選定的遮色片樣式
        selectedMaskStyle = {
          style: style,
          color: color,
          blur: true
        };
        
        // 更新顏色輸入框以對應預設值
        const colorMap = {
          'white-blur': '#f5f5f5',
          'light-blur-gray': '#d3d3d3',
          'dark-blur-gray': '#646464',
          'darker-blur-gray': '#323232'
        };
        
        if (colorMap[style]) {
          colorInput.value = colorMap[style];
        }
        
        // 即時更新遮色片樣式
        await updateReadingMaskStyle(selectedMaskStyle);
      });
    });
  }

  // 初始化所有預設顏色
  setupPresetColors('blockPresets', blockColorInput);
  setupPresetColors('notePresets', noteColorInput);
  setupMaskPresetColors('maskPresets', maskColorInput);

  // =============================================================================
  // 消息通信
  // =============================================================================

  /**
   * 向當前活動標籤頁發送消息
   * @param {string} action - 要執行的動作
   * @param {string} color - 顏色參數
   * @returns {Promise} - 消息發送結果
   */
  async function sendMessageToTab(actionOrMessage, color) {
    const message = typeof actionOrMessage === 'string'
      ? { action: actionOrMessage, color }
      : actionOrMessage;
    const response = await tabMessaging.sendMessageToActiveTab(message);
    console.log('Message sent successfully:', message.action);
    return response;
  }

  // =============================================================================
  // 頁面支援檢查
  // =============================================================================

  /**
   * 檢查當前頁面是否支援擴展功能
   */
  async function checkPageSupport() {
    try {
      const currentTab = await tabMessaging.getActiveTab();
      if (!tabMessaging.isSupportedPageUrl(currentTab.url)) {
        errorContainer.style.display = 'block';
        mainContainer.style.display = 'none';
      }
    } catch (e) {
      console.log('Tab query error:', e);
      errorContainer.style.display = 'block';
      mainContainer.style.display = 'none';
    }
  }

  // 執行頁面支援檢查
  if (!isPreviewMode) {
    checkPageSupport();
  }

  // =============================================================================
  // 按鈕事件綁定
  // =============================================================================

  /**
   * 綁定新增閱讀色卡按鈕事件
   */
  if (addBlockButton) {
    addBlockButton.addEventListener('click', async () => {
      console.log('FocusCut Popup: Reading card button clicked');
      const color = blockColorInput.value;
      try {
        await sendMessageToTab('addBlock', color);
        console.log('Reading card added successfully');
      } catch (error) {
        console.error('Failed to add reading card:', error);
        showErrorMessage('無法新增閱讀色卡，請重新整理頁面後再試。');
      }
    });
  }
  
  /**
   * 綁定新增便利貼按鈕事件
   */
  if (addNoteButton) {
    addNoteButton.addEventListener('click', async () => {
      console.log('FocusCut Popup: Note button clicked');
      const color = noteColorInput.value;
      try {
        await sendMessageToTab('addNote', color);
        console.log('Note added successfully');
      } catch (error) {
        console.error('Failed to add note:', error);
        showErrorMessage('無法新增便利貼，請重新整理頁面後再試。');
      }
    });
  }

  if (clearPageButton) {
    const updateClearPageLabel = () => {
      const { label } = getClearPageCopy();
      clearPageButton.title = label;
      clearPageButton.setAttribute('aria-label', label);
    };
    updateClearPageLabel();
    queueMicrotask(updateClearPageLabel);

    clearPageButton.addEventListener('click', async () => {
      const copy = getClearPageCopy();
      const confirmed = window.confirm(copy.confirm);
      if (!confirmed) return;

      clearPageButton.disabled = true;
      try {
        const response = await sendMessageToTab({ action: 'clearAll' });
        if (response?.status === 'error') {
          throw new Error(response.message || 'Clear failed');
        }

        const readingMaskToggle = document.getElementById('toggle-reading-mask');
        const highlighterToggle = document.getElementById('toggle-highlighter');
        if (readingMaskToggle) readingMaskToggle.checked = false;
        if (highlighterToggle) highlighterToggle.checked = false;
      } catch (error) {
        console.error('Failed to clear current page:', error);
        showErrorMessage(copy.error);
      } finally {
        clearPageButton.disabled = false;
      }
    });
  }

  // =============================================================================
  // 錯誤處理
  // =============================================================================

  /**
   * 顯示臨時錯誤訊息
   * @param {string} message - 要顯示的錯誤訊息
   */
  function showErrorMessage(message) {
    // 移除之前的錯誤訊息
    const existingError = document.querySelector('.temp-error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // 創建錯誤訊息元素
    const errorMessage = document.createElement('div');
    errorMessage.className = 'temp-error-message';
    errorMessage.style.cssText = `
      color: red;
      padding: 10px;
      margin-top: 10px;
      font-size: 12px;
      background-color: #ffebee;
      border: 1px solid #ffcdd2;
      border-radius: 4px;
    `;
    errorMessage.textContent = message;
    
    // 添加到彈出窗口中
    document.body.appendChild(errorMessage);
    
    // 5秒後自動移除
    setTimeout(() => {
      if (errorMessage && errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 5000);
  }

  // =============================================================================
  // 功能開關管理
  // =============================================================================

  /**
   * 遮色片開關功能
   */
  const toggleReadingMaskCheckbox = document.getElementById('toggle-reading-mask');
  if (toggleReadingMaskCheckbox) {
    // 開關狀態變更事件
    toggleReadingMaskCheckbox.addEventListener('change', async () => {
      try {
        const response = await sendMessageToTab({
          action: 'toggleReadingMask',
          maskStyle: selectedMaskStyle
        });
        if (response && response.isVisible !== undefined) {
          toggleReadingMaskCheckbox.checked = response.isVisible;
        }
      } catch (error) {
        console.error('Error toggling reading mask:', error);
        toggleReadingMaskCheckbox.checked = !toggleReadingMaskCheckbox.checked;
        showErrorMessage('無法啟用遮色片，請重新整理頁面後再試。');
      }
    });
    
    // 檢查遮色片當前狀態並更新開關
    if (!isPreviewMode) {
      checkToggleStatus('checkReadingMaskStatus', toggleReadingMaskCheckbox);
    }
  }
  
  /**
   * 螢光筆盒開關功能
   */
  const toggleHighlighterCheckbox = document.getElementById('toggle-highlighter');
  if (toggleHighlighterCheckbox) {
    // 開關狀態變更事件
    toggleHighlighterCheckbox.addEventListener('change', async () => {
      try {
        const response = await sendMessageToTab({
          action: 'toggleHighlighterBox',
          color: '#ffff00' // 預設黃色
        });
        if (response && response.isVisible !== undefined) {
          toggleHighlighterCheckbox.checked = response.isVisible;
        }
      } catch (error) {
        console.error('Error toggling highlighter:', error);
        toggleHighlighterCheckbox.checked = !toggleHighlighterCheckbox.checked;
      }
    });
    
    // 檢查螢光筆盒當前狀態並更新開關
    if (!isPreviewMode) {
      checkToggleStatus('checkHighlighterBoxStatus', toggleHighlighterCheckbox);
    }
  }

  // =============================================================================
  // 輔助函數
  // =============================================================================

  /**
   * 檢查功能開關的當前狀態並更新 UI
   * @param {string} action - 要檢查的動作
   * @param {HTMLElement} checkbox - 要更新的開關元素
   */
  async function checkToggleStatus(action, checkbox) {
    try {
      const response = await sendMessageToTab({ action });
      if (response && response.isVisible !== undefined) {
        checkbox.checked = response.isVisible;
      }
    } catch (e) {
      console.log('Unable to check toggle status:', e.message);
    }
  }
});
