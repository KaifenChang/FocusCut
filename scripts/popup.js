document.addEventListener('DOMContentLoaded', () => {
  console.log('FocusCut Popup: Loaded');
  
  const errorContainer = document.getElementById('error-container');
  const mainContainer = document.getElementById('main-container');
  const addBlockButton = document.getElementById('addBlock');
  const addNoteButton = document.getElementById('addNote');
  const blockColorInput = document.getElementById('blockColor');
  const noteColorInput = document.getElementById('noteColor');
  const maskColorInput = document.getElementById('maskColor');
  const blockColorPreview = document.getElementById('blockColorPreview');
  const noteColorPreview = document.getElementById('noteColorPreview');
  const maskColorPreview = document.getElementById('maskColorPreview');
  
  // TODO: 未來功能 - 處理自訂顏色按鈕點擊
  /*
  document.getElementById('blockCustomColor').addEventListener('click', () => {
    blockColorInput.click();
  });
  
  document.getElementById('noteCustomColor').addEventListener('click', () => {
    noteColorInput.click();
  });
  */
  
  // 處理顏色輸入變化，更新預覽
  blockColorInput.addEventListener('input', () => {
    // 直接從content.js採用相同的顏色轉換邏輯
    const color = blockColorInput.value;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    blockColorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
  });
  
  noteColorInput.addEventListener('input', () => {
    noteColorPreview.style.backgroundColor = noteColorInput.value;
  });
  
  maskColorInput.addEventListener('input', async () => {
    // 將Hex顏色轉換為rgba格式用於遮色片
    const color = maskColorInput.value;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
    maskColorPreview.style.backgroundColor = rgbaColor;
    
    // 更新選定的遮色片樣式
    selectedMaskStyle = {
      style: 'custom',
      color: rgbaColor,
      blur: true
    };
    
    // 如果遮色片已開啟，即時更新樣式
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateReadingMaskStyle',
          maskStyle: selectedMaskStyle
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
  });
  
  // 設置預設顏色點擊事件
  function setupPresetColors(presetsId, colorInput, colorPreview) {
    const presets = document.getElementById(presetsId);
    if (presets) {
      presets.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
          const color = preset.getAttribute('data-color');
          colorInput.value = color;
          
          // 更新預覽顏色 - 確保完全一致的外觀
          if (presetsId === 'blockPresets') {
            // 閱讀色卡需要透明效果和邊框
            colorPreview.style.backgroundColor = preset.style.backgroundColor;
            colorPreview.style.border = preset.style.border;
          } else {
            colorPreview.style.backgroundColor = color;
          }
        });
      });
    }
  }
  
  // 設置遮色片預設顏色點擊事件
  function setupMaskPresetColors(presetsId, colorInput, colorPreview) {
    const presets = document.getElementById(presetsId);
    if (presets) {
      presets.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', async () => {
          const color = preset.getAttribute('data-color');
          const style = preset.getAttribute('data-style');
          
          // 更新預覽顏色
          colorPreview.style.backgroundColor = color;
          
          // 儲存選定的遮色片樣式
          selectedMaskStyle = {
            style: style,
            color: color,
            blur: true
          };
          
          // 如果有對應的hex值，更新顏色輸入框
          if (style === 'white-blur') {
            colorInput.value = '#f5f5f5';
          } else if (style === 'light-blur-gray') {
            colorInput.value = '#d3d3d3';
          } else if (style === 'dark-blur-gray') {
            colorInput.value = '#646464';
          }
          
          // 如果遮色片已開啟，即時更新樣式
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'updateReadingMaskStyle',
                maskStyle: selectedMaskStyle
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
        });
      });
    }
  }
  
  // 設置元素的預設顏色
  setupPresetColors('blockPresets', blockColorInput, blockColorPreview);
  setupPresetColors('notePresets', noteColorInput, noteColorPreview);
  setupMaskPresetColors('maskPresets', maskColorInput, maskColorPreview);
  
  // 修改方塊顏色預覽的背景顏色
  const updateBlockColorPreview = () => {
    const colorValue = blockColorInput.value;
    // 轉換為rgba，透明度0.15 - 與content.js使用相同值
    const r = parseInt(colorValue.slice(1, 3), 16);
    const g = parseInt(colorValue.slice(3, 5), 16);
    const b = parseInt(colorValue.slice(5, 7), 16);
    blockColorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
    blockColorPreview.style.border = '1px dashed rgba(0, 0, 0, 0.2)';
  };
  
  // 初始化時呼叫一次
  updateBlockColorPreview();
  
  // 修改遮色片顏色預覽的背景顏色
  const updateMaskColorPreview = () => {
    const colorValue = maskColorInput.value;
    // 轉換為rgba，透明度0.4
    const r = parseInt(colorValue.slice(1, 3), 16);
    const g = parseInt(colorValue.slice(3, 5), 16);
    const b = parseInt(colorValue.slice(5, 7), 16);
    maskColorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
  };
  
  // 初始化遮色片顏色預覽
  updateMaskColorPreview();
  
  // 修復按鈕點擊問題，改用簡化的消息發送方式
  function sendMessageToTab(action, color) {
    return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
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
  
  // 檢查當前頁面是否支援
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs && tabs.length > 0 ? tabs[0] : null;
      
      // 檢查是否是支援的頁面
      if (!currentTab || !currentTab.url || 
          currentTab.url.startsWith('chrome://') || 
          currentTab.url.startsWith('edge://') || 
          currentTab.url.startsWith('about:') ||
          currentTab.url.startsWith('chrome-extension://')) {
        errorContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        return;
      }
    });
  } catch (e) {
    console.log('Tab query error:', e);
  }
  
  // 綁定按鈕事件 - 使用獨立事件綁定，避免嵌套在查詢中
  if (addBlockButton) {
    addBlockButton.addEventListener('click', async () => {
      console.log('FocusCut Popup: Reading card button clicked');
      // 確保只傳送原始Hex顏色，透明度由content.js處理
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

  // 顯示錯誤訊息的函數
  function showErrorMessage(message) {
    // 移除之前的錯誤訊息
    const existingError = document.querySelector('.temp-error-message');
    if (existingError) {
      existingError.remove();
    }
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'temp-error-message';
    errorMessage.style.color = 'red';
    errorMessage.style.padding = '10px';
    errorMessage.style.marginTop = '10px';
    errorMessage.style.fontSize = '12px';
    errorMessage.style.backgroundColor = '#ffebee';
    errorMessage.style.border = '1px solid #ffcdd2';
    errorMessage.style.borderRadius = '4px';
    errorMessage.textContent = message;
    
    // 添加到彈出窗口中
    document.body.appendChild(errorMessage);
    
    // 5秒後移除錯誤訊息
    setTimeout(() => {
      if (errorMessage && errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 5000);
  }

  // 遮色片功能設置 - 使用預設樣式
  let selectedMaskStyle = {
    style: 'dark-blur-gray',
    color: 'rgba(120, 120, 120, 0.4)',
    blur: true
  };

  const toggleReadingMaskButton = document.getElementById('toggle-reading-mask');
  if (toggleReadingMaskButton) {
    toggleReadingMaskButton.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 檢查標籤頁是否存在
        if (!tab || !tab.id) {
          console.error('No active tab found');
          return;
        }
        
        // 發送消息給內容腳本，包含選中的樣式信息
        chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleReadingMask',
          maskStyle: selectedMaskStyle
        }, (response) => {
          // 根據回應更新按鈕文字
          if (response && response.isVisible !== undefined) {
            toggleReadingMaskButton.textContent = response.isVisible ? 
              chrome.i18n.getMessage('closeReadingMask') || '關閉遮色片' : 
              chrome.i18n.getMessage('enableReadingMask') || '啟用遮色片';
          }
          
          if (chrome.runtime.lastError) {
            // 顯示錯誤訊息
            console.error('Error toggling reading mask:', chrome.runtime.lastError.message);
            showErrorMessage('無法啟用遮色片，請重新整理頁面後再試。');
          }
        });
        
        // 不再關閉彈出窗口，讓用戶可以繼續使用選單
        // window.close();
      } catch (error) {
        console.error('Error toggling reading mask:', error);
        showErrorMessage('無法啟用遮色片，請重新整理頁面後再試。');
      }
    });
    
    // 檢查遮色片的當前狀態並更新按鈕文字
    try {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'checkReadingMaskStatus' },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Ignore this error:', chrome.runtime.lastError.message);
                return;
              }
              
              if (response && response.isVisible !== undefined) {
                toggleReadingMaskButton.textContent = response.isVisible ? 
                  chrome.i18n.getMessage('closeReadingMask') || '關閉遮色片' : 
                  chrome.i18n.getMessage('enableReadingMask') || '啟用遮色片';
              }
            }
          );
        }
      });
    } catch (e) {
      console.log('Error checking reading mask status:', e);
    }
  }
  
  // 螢光筆切換按鈕事件
  const toggleHighlighterButton = document.getElementById('toggle-highlighter');
  if (toggleHighlighterButton) {
    toggleHighlighterButton.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 檢查標籤頁是否存在
        if (!tab || !tab.id) {
          console.error('No active tab found');
          return;
        }
        
        // 發送消息給內容腳本，來切換螢光筆盒
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleHighlighterBox',
          color: '#ffff00' // 預設黃色
        }, (response) => {
          // 根據回應更新按鈕文字 (現在會執行，因為不再關閉彈出窗口)
          if (response && response.isVisible !== undefined) {
            toggleHighlighterButton.textContent = response.isVisible ? 
              chrome.i18n.getMessage('disableHighlighter') || '關閉螢光筆盒' : 
              chrome.i18n.getMessage('enableHighlighter') || '開啟螢光筆盒';
          }
        });
        
        // 不再關閉彈出窗口，讓用戶可以繼續使用目錄
        // window.close();
      } catch (error) {
        console.error('Error toggling highlighter:', error);
      }
    });
    
    // 檢查螢光筆盒的當前狀態並更新按鈕文字
    try {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'checkHighlighterBoxStatus' },
            (response) => {
              if (chrome.runtime.lastError) {
                console.log('Ignore this error:', chrome.runtime.lastError.message);
                return;
              }
              
              if (response && response.isVisible !== undefined) {
                toggleHighlighterButton.textContent = response.isVisible ? 
                  chrome.i18n.getMessage('disableHighlighter') || '關閉螢光筆盒' : 
                  chrome.i18n.getMessage('enableHighlighter') || '開啟螢光筆盒';
              }
            }
          );
        }
      });
    } catch (e) {
      console.log('Error checking highlighter status:', e);
    }
  }
}); 