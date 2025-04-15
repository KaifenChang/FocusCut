document.addEventListener('DOMContentLoaded', () => {
  console.log('FocusCut Popup: Loaded');
  
  const errorContainer = document.getElementById('error-container');
  const mainContainer = document.getElementById('main-container');
  const addDividerButton = document.getElementById('addDivider');
  const addBlockButton = document.getElementById('addBlock');
  const addNoteButton = document.getElementById('addNote');
  const dividerColorInput = document.getElementById('dividerColor');
  const blockColorInput = document.getElementById('blockColor');
  const noteColorInput = document.getElementById('noteColor');
  const dividerColorPreview = document.getElementById('dividerColorPreview');
  const blockColorPreview = document.getElementById('blockColorPreview');
  const noteColorPreview = document.getElementById('noteColorPreview');
  
  // 處理自訂顏色按鈕點擊
  document.getElementById('dividerCustomColor').addEventListener('click', () => {
    dividerColorInput.click();
  });
  
  document.getElementById('blockCustomColor').addEventListener('click', () => {
    blockColorInput.click();
  });
  
  document.getElementById('noteCustomColor').addEventListener('click', () => {
    noteColorInput.click();
  });
  
  // 新增: 處理螢光筆自訂顏色按鈕點擊
  document.getElementById('highlighterCustomColor').addEventListener('click', () => {
    highlighterColorInput.click();
  });
  
  // 處理顏色輸入變化，更新預覽
  dividerColorInput.addEventListener('input', () => {
    dividerColorPreview.style.backgroundColor = dividerColorInput.value;
  });
  
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
  
  // 新增: 處理螢光筆顏色輸入變化，更新預覽
  const highlighterColorInput = document.getElementById('highlighterColor');
  const highlighterColorPreview = document.getElementById('highlighterColorPreview');
  
  highlighterColorInput.addEventListener('input', () => {
    const color = highlighterColorInput.value;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    highlighterColorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
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
          } else if (presetsId === 'highlighterPresets') {
            // 螢光筆預覽也需要半透明效果
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            colorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
          } else {
            colorPreview.style.backgroundColor = color;
          }
        });
      });
    }
  }
  
  // 設置三種元素的預設顏色
  setupPresetColors('dividerPresets', dividerColorInput, dividerColorPreview);
  setupPresetColors('blockPresets', blockColorInput, blockColorPreview);
  setupPresetColors('notePresets', noteColorInput, noteColorPreview);
  setupPresetColors('highlighterPresets', highlighterColorInput, highlighterColorPreview);
  
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

  // 新增: 初始化螢光筆顏色預覽
  const updateHighlighterColorPreview = () => {
    const colorValue = highlighterColorInput.value;
    // 轉換為rgba，透明度0.5
    const r = parseInt(colorValue.slice(1, 3), 16);
    const g = parseInt(colorValue.slice(3, 5), 16);
    const b = parseInt(colorValue.slice(5, 7), 16);
    highlighterColorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
  };
  
  // 初始化時呼叫一次
  updateBlockColorPreview();
  updateHighlighterColorPreview();
  
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
  if (addDividerButton) {
    addDividerButton.addEventListener('click', () => {
      console.log('FocusCut Popup: Divider button clicked');
      const color = dividerColorInput.value;
      sendMessageToTab('addDivider', color);
    });
  }
  
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

  // 新增: 螢光筆功能
  const enableHighlighterButton = document.getElementById('enableHighlighter');
  if (enableHighlighterButton) {
    enableHighlighterButton.addEventListener('click', () => {
      console.log('FocusCut Popup: Highlighter button clicked');
      const color = highlighterColorInput.value;
      sendMessageToTab('enableHighlighter', color);
      window.close(); // 關閉彈出視窗，讓用戶能直接使用螢光筆
    });
  }

  // 遮色片樣式選擇功能
  let selectedMaskStyle = {
    style: 'blur-gray',
    blur: true,
    color: 'rgba(120, 120, 120, 0.4)'
  };
  
  // 初始化選中第一個選項
  document.querySelector('.style-option').classList.add('selected');
  
  // 為所有樣式選項添加點擊事件
  document.querySelectorAll('.style-option').forEach(option => {
    option.addEventListener('click', () => {
      // 移除其他選項的選中狀態
      document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('selected'));
      
      // 添加選中狀態
      option.classList.add('selected');
      
      // 更新選中的樣式
      selectedMaskStyle = {
        style: option.getAttribute('data-style'),
        blur: option.getAttribute('data-blur') === 'true',
        color: option.getAttribute('data-color')
      };
      
      console.log('Selected mask style:', selectedMaskStyle);
    });
  });

  // 遮色片功能
  document.getElementById('toggle-reading-mask').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 檢查標籤頁是否存在
      if (!tab || !tab.id) {
        console.error('No active tab found');
        return;
      }
      
      // 直接發送消息給內容腳本，包含樣式信息
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleReadingMask',
        maskStyle: selectedMaskStyle
      });
      console.log('FocusCut: Message sent to content script with style:', selectedMaskStyle);
      
      // 關閉彈出視窗
      window.close();
    } catch (error) {
      console.error('Failed to toggle reading mask:', error);
      alert('無法啟用遮色片。請重新載入頁面後再試一次。');
    }
  });
}); 