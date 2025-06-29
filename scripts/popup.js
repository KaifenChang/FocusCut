document.addEventListener('DOMContentLoaded', () => {
  console.log('FocusCut Popup: Loaded');
  
  const errorContainer = document.getElementById('error-container');
  const mainContainer = document.getElementById('main-container');
  const addBlockButton = document.getElementById('addBlock');
  const addNoteButton = document.getElementById('addNote');
  const blockColorInput = document.getElementById('blockColor');
  const noteColorInput = document.getElementById('noteColor');
  const blockColorPreview = document.getElementById('blockColorPreview');
  const noteColorPreview = document.getElementById('noteColorPreview');
  
  // 處理自訂顏色按鈕點擊
  document.getElementById('blockCustomColor').addEventListener('click', () => {
    blockColorInput.click();
  });
  
  document.getElementById('noteCustomColor').addEventListener('click', () => {
    noteColorInput.click();
  });
  
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
  
  // 設置元素的預設顏色
  setupPresetColors('blockPresets', blockColorInput, blockColorPreview);
  setupPresetColors('notePresets', noteColorInput, noteColorPreview);
  
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

  // 遮色片功能設置
  const maskColorPreview = document.getElementById('maskColorPreview');
  let selectedMaskStyle = {
    style: 'white-blur',
    color: 'rgba(245, 245, 245, 0.4)'
  };
  
  // 找到第一個遮色片顏色選項
  const firstMaskPreset = document.querySelector('#maskPresets .color-preset');
  if (firstMaskPreset) {
    // 標記為選中狀態
    firstMaskPreset.classList.add('selected');
    
    // 設置初始預覽顏色
    const bgColor = firstMaskPreset.style.backgroundColor;
    maskColorPreview.style.backgroundColor = bgColor;
  }
  
  // 為遮色片顏色預設選項添加點擊事件
  const maskPresets = document.getElementById('maskPresets');
  if (maskPresets) {
    maskPresets.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        // 重置所有選項的選中狀態
        maskPresets.querySelectorAll('.color-preset').forEach(p => {
          p.classList.remove('selected');
        });
        
        // 設置當前選項為選中狀態
        preset.classList.add('selected');
        
        // 更新預覽顏色
        const bgColor = preset.style.backgroundColor;
        maskColorPreview.style.backgroundColor = bgColor;
        
        // 更新選中的樣式
        selectedMaskStyle = {
          style: preset.getAttribute('data-style'),
          color: preset.getAttribute('data-color')
        };
        
        console.log('Selected mask style:', selectedMaskStyle);
      });
    });
  }

  document.getElementById('toggle-reading-mask').addEventListener('click', async () => {
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
        // 檢查是否有回應，如果有才關閉窗口
        if (!chrome.runtime.lastError) {
          // 關閉彈出窗口，讓用戶可以看到遮色片效果
          window.close();
        } else {
          // 顯示錯誤訊息
          console.error('Error toggling reading mask:', chrome.runtime.lastError.message);
          
          // 在彈出窗口中顯示錯誤訊息
          const errorMessage = document.createElement('div');
          errorMessage.className = 'error-message';
          errorMessage.style.color = 'red';
          errorMessage.style.padding = '10px';
          errorMessage.style.marginTop = '10px';
          errorMessage.textContent = '無法啟用遮色片，請重新整理頁面後再試。';
          
          // 添加到彈出窗口中
          document.body.appendChild(errorMessage);
          
          // 3秒後移除錯誤訊息
          setTimeout(() => {
            if (errorMessage && errorMessage.parentNode) {
              errorMessage.parentNode.removeChild(errorMessage);
            }
          }, 3000);
        }
      });
    } catch (error) {
      console.error('Error toggling reading mask:', error);
    }
  });
  
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
            toggleHighlighterButton.textContent = response.isVisible ? '關閉螢光筆盒' : '開啟螢光筆盒';
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
                toggleHighlighterButton.textContent = response.isVisible ? '關閉螢光筆盒' : '開啟螢光筆盒';
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