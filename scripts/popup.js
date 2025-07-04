/**
 * FocusOverlay Popup Script
 * =========================
 * 
 * 功能說明：
 * - 管理彈窗介面的所有互動功能
 * - 處理顏色選擇和預設色票
 * - 與 content script 通信執行功能
 * - 管理遮色片和螢光筆盒的狀態
 * 
 * 作者：KXii
 * 版本：v1.1
 */

// =============================================================================
// 彈窗初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('FocusCut Popup: Loaded');
  
  // 獲取所有 DOM 元素
  const errorContainer = document.getElementById('error-container');
  const mainContainer = document.getElementById('main-container');
  const addBlockButton = document.getElementById('addBlock');
  const addNoteButton = document.getElementById('addNote');
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
    style: 'dark-blur-gray',
    color: 'rgba(120, 120, 120, 0.4)',
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateReadingMaskStyle',
          maskStyle: maskStyle
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Reading mask not active or failed to update:', chrome.runtime.lastError.message);
          } else {
            console.log('Reading mask style updated successfully');
          }
        });
      }
    } catch (error) {
      console.error('Error updating reading mask style:', error);
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

    presets.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        // 移除所有 selected class
        presets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
        
        // 為點擊的色票添加 selected class
        preset.classList.add('selected');
        
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

    presets.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', async () => {
        // 移除所有 selected class
        presets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
        
        // 為點擊的色票添加 selected class
        preset.classList.add('selected');
        
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
          'dark-blur-gray': '#646464'
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
  function sendMessageToTab(action, color) {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            console.error('Tab query error:', chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
            return;
          }
          
          if (tabs && tabs.length > 0 && tabs[0].id) {
            try {
              chrome.tabs.sendMessage(
                tabs[0].id,
                { action, color },
                (response) => {
                  if (chrome.runtime.lastError) {
                    console.error('Message send error:', chrome.runtime.lastError.message);
                    reject(chrome.runtime.lastError);
                  } else {
                    console.log('Message sent successfully:', { action, color });
                    resolve(response);
                  }
                }
              );
            } catch (e) {
              console.error('Failed to send message:', e);
              reject(e);
            }
          } else {
            const error = new Error('No active tab found');
            console.error(error.message);
            reject(error);
          }
        });
      } catch (e) {
        console.error('Error in tab query:', e);
        reject(e);
      }
    });
  }

  // =============================================================================
  // 頁面支援檢查
  // =============================================================================

  /**
   * 檢查當前頁面是否支援擴展功能
   */
  function checkPageSupport() {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs && tabs.length > 0 ? tabs[0] : null;
        
        // 檢查是否是不支援的頁面
        const unsupportedPrefixes = [
          'chrome://',
          'edge://',
          'about:',
          'chrome-extension://'
        ];
        
        if (!currentTab || !currentTab.url || 
            unsupportedPrefixes.some(prefix => currentTab.url.startsWith(prefix))) {
          errorContainer.style.display = 'block';
          mainContainer.style.display = 'none';
          return;
        }
      });
    } catch (e) {
      console.log('Tab query error:', e);
    }
  }

  // 執行頁面支援檢查
  checkPageSupport();

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
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
          console.error('No active tab found');
          return;
        }
        
        // 發送切換遮色片消息
        chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleReadingMask',
          maskStyle: selectedMaskStyle
        }, (response) => {
          // 同步開關狀態
          if (response && response.isVisible !== undefined) {
            toggleReadingMaskCheckbox.checked = response.isVisible;
          }
          
          if (chrome.runtime.lastError) {
            console.error('Error toggling reading mask:', chrome.runtime.lastError.message);
            toggleReadingMaskCheckbox.checked = !toggleReadingMaskCheckbox.checked;
            showErrorMessage('無法啟用遮色片，請重新整理頁面後再試。');
          }
        });
        
      } catch (error) {
        console.error('Error toggling reading mask:', error);
        toggleReadingMaskCheckbox.checked = !toggleReadingMaskCheckbox.checked;
        showErrorMessage('無法啟用遮色片，請重新整理頁面後再試。');
      }
    });
    
    // 檢查遮色片當前狀態並更新開關
    checkToggleStatus('checkReadingMaskStatus', toggleReadingMaskCheckbox);
  }
  
  /**
   * 螢光筆盒開關功能
   */
  const toggleHighlighterCheckbox = document.getElementById('toggle-highlighter');
  if (toggleHighlighterCheckbox) {
    // 開關狀態變更事件
    toggleHighlighterCheckbox.addEventListener('change', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.id) {
          console.error('No active tab found');
          return;
        }
        
        // 發送切換螢光筆盒消息
        chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleHighlighterBox',
          color: '#ffff00' // 預設黃色
        }, (response) => {
          // 同步開關狀態
          if (response && response.isVisible !== undefined) {
            toggleHighlighterCheckbox.checked = response.isVisible;
          }
          
          if (chrome.runtime.lastError) {
            console.error('Error toggling highlighter:', chrome.runtime.lastError.message);
            toggleHighlighterCheckbox.checked = !toggleHighlighterCheckbox.checked;
          }
        });
        
      } catch (error) {
        console.error('Error toggling highlighter:', error);
        toggleHighlighterCheckbox.checked = !toggleHighlighterCheckbox.checked;
      }
    });
    
    // 檢查螢光筆盒當前狀態並更新開關
    checkToggleStatus('checkHighlighterBoxStatus', toggleHighlighterCheckbox);
  }

  // =============================================================================
  // 輔助函數
  // =============================================================================

  /**
   * 檢查功能開關的當前狀態並更新 UI
   * @param {string} action - 要檢查的動作
   * @param {HTMLElement} checkbox - 要更新的開關元素
   */
  function checkToggleStatus(action, checkbox) {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: action },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Ignore this error:', chrome.runtime.lastError.message);
                return;
              }
              
              if (response && response.isVisible !== undefined) {
                checkbox.checked = response.isVisible;
              }
            }
          );
        }
      });
    } catch (e) {
      console.log('Error checking toggle status:', e);
    }
  }
}); 