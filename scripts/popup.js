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
    try {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs.length > 0 && tabs[0].id) {
          try {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action, color },
              (response) => {
                // 忽略錯誤消息
                if (chrome.runtime.lastError) {
                  console.log('Ignore this error:', chrome.runtime.lastError.message);
                }
              }
            );
          } catch (e) {
            console.log('Failed to send message:', e);
          }
        }
      });
    } catch (e) {
      console.log('Error in tab query:', e);
    }
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
    addBlockButton.addEventListener('click', () => {
      console.log('FocusCut Popup: Reading card button clicked');
      // 確保只傳送原始Hex顏色，透明度由content.js處理
      const color = blockColorInput.value;
      sendMessageToTab('addBlock', color);
    });
  }
  
  if (addNoteButton) {
    addNoteButton.addEventListener('click', () => {
      console.log('FocusCut Popup: Note button clicked');
      const color = noteColorInput.value;
      sendMessageToTab('addNote', color);
    });
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
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleReadingMask',
        maskStyle: selectedMaskStyle
      });
      
      // 關閉彈出窗口，讓用戶可以看到遮色片效果
      window.close();
    } catch (error) {
      console.error('Error toggling reading mask:', error);
    }
  });
}); 