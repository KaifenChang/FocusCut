/**
 * FocusCut - 多語言國際化處理庫
 * 安全版本：使用延遲操作、備用值和捕獲所有可能的錯誤
 */

(function() {
  // 避免全局變量污染
  
  // 安全地獲取語言代碼
  function getLanguage() {
    try {
      // 嘗試獲取 Chrome API 語言
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        return chrome.i18n.getUILanguage().replace('-', '_');
      }
    } catch (e) {
      console.debug('Failed to get Chrome language:', e);
    }
    
    try {
      // 嘗試獲取瀏覽器語言
      return navigator.language.replace('-', '_');
    } catch (e) {
      console.debug('Failed to get browser language:', e);
    }
    
    // 默認語言
    return 'en';
  }
  
  // 安全地獲取翻譯
  function getMessage(key, defaultText) {
    try {
      // 優先使用 Chrome 擴展 API
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
        const message = chrome.i18n.getMessage(key);
        if (message) {
          return message;
        }
      }
    } catch (e) {
      console.debug('Chrome i18n API error:', e);
    }
    
    // 如果 Chrome API 失敗，返回默認文本
    return defaultText || key;
  }
  
  // 安全地更新頁面元素
  function updateElement(elementId, messageKey, defaultText, suffix) {
    try {
      // 延遲操作，確保DOM已加載
      setTimeout(function() {
        try {
          const element = document.getElementById(elementId);
          if (!element) {
            return; // 元素不存在，安全地返回
          }
          
          // 獲取翻譯文本
          const text = getMessage(messageKey, defaultText);
          
          // 設置文本內容
          element.textContent = text + (suffix || '');
        } catch (innerError) {
          console.debug(`Failed to update element ${elementId}:`, innerError);
        }
      }, 0);
    } catch (e) {
      // 捕獲所有可能的錯誤
      console.debug('Error in updateElement:', e);
    }
  }
  
  // 安全地更新 HTML 內容
  function updateHTML(elementId, htmlContent) {
    try {
      setTimeout(function() {
        try {
          const element = document.getElementById(elementId);
          if (!element) {
            return;
          }
          
          element.innerHTML = htmlContent;
        } catch (innerError) {
          console.debug(`Failed to update HTML for ${elementId}:`, innerError);
        }
      }, 0);
    } catch (e) {
      console.debug('Error in updateHTML:', e);
    }
  }
  
  // 安全地設置屬性
  function updateAttribute(elementId, attribute, messageKey, defaultText) {
    try {
      setTimeout(function() {
        try {
          const element = document.getElementById(elementId);
          if (!element) {
            return;
          }
          
          const value = getMessage(messageKey, defaultText);
          element.setAttribute(attribute, value);
        } catch (innerError) {
          console.debug(`Failed to update attribute for ${elementId}:`, innerError);
        }
      }, 0);
    } catch (e) {
      console.debug('Error in updateAttribute:', e);
    }
  }
  
  // 安全地處理 GitHub 連結
  function updateRepoLink() {
    try {
      setTimeout(function() {
        try {
          const repoLink = document.getElementById('repo-link');
          if (!repoLink) {
            return;
          }
          
          const repoSpan = repoLink.querySelector('span');
          if (repoSpan) {
            repoSpan.textContent = getMessage('viewSourceCode');
          }
        } catch (innerError) {
          console.debug('Failed to update repo link:', innerError);
        }
      }, 0);
    } catch (e) {
      console.debug('Error in updateRepoLink:', e);
    }
  }
  
  // 檢查並設置 Buy Me a Coffee 連結的文本
  function updateCoffeeLink() {
    try {
      setTimeout(function() {
        try {
          // 更新贊助摺疊區塊標題
          const sponsorSummary = document.getElementById('sponsor-summary');
          if (sponsorSummary) {
            sponsorSummary.textContent = getMessage('sponsorDeveloper', '☕ Support Developer');
          }
          
          // 更新贊助訊息
          const sponsorMessage = document.querySelector('details p');
          if (sponsorMessage) {
            // 處理換行符號
            const message = getMessage('sponsorMessage', 'FocusCut is a small tool I developed independently. I hope it helps you read more focused.\nIf you find it useful, perhaps you could buy me a coffee 💛');
            const formattedMessage = message.replace('\n', '<br>');
            
            // 尋找連結，保留它，但更新其他部分
            const coffeeLink = sponsorMessage.querySelector('a');
            if (coffeeLink) {
              const linkHTML = coffeeLink.outerHTML;
              sponsorMessage.innerHTML = formattedMessage + '  ' + linkHTML;
            } else {
              sponsorMessage.innerHTML = formattedMessage;
            }
          }
          
          // 更新咖啡連結文字
          const coffeeLink = document.getElementById('coffee-link');
          if (coffeeLink) {
            coffeeLink.textContent = getMessage('buyMeCoffee', 'Buy Me a Coffee');
          }
        } catch (innerError) {
          console.debug('Failed to update coffee elements:', innerError);
        }
      }, 0);
    } catch (e) {
      console.debug('Error in updateCoffeeLink:', e);
    }
  }
  
  // 初始化所有頁面元素
  function initializePage() {
    try {
      // 根據當前頁面 URL 決定要初始化哪些元素
      const currentURL = window.location.href;
      
      // 檢測頁面類型
      const isPopupPage = currentURL.includes('popup.html');
      const isAboutPage = currentURL.includes('about.html');
      
      if (isAboutPage) {
        // 初始化關於頁面
        initializeAboutPage();
      } else if (isPopupPage) {
        // 初始化彈出窗口
        initializePopupPage();
      }
    } catch (e) {
      console.debug('Failed to initialize page:', e);
    }
  }
  
  // 初始化關於頁面
  function initializeAboutPage() {
    // 基本文本
    updateElement('title', 'aboutLink', 'About FocusCut');
    updateElement('version-label', 'versionInfo', 'Version', ':');
    updateElement('developer-label', 'developer', 'Developer', ':');
    updateElement('license-label', 'licenseInfo', 'License', ':');
    updateElement('rights-reserved', 'allRightsReserved', 'All Rights Reserved');
    
    // 連結和按鈕
    updateElement('back-link', 'backLink', '← Back');
    updateElement('license-value', 'mitLicense', 'MIT License');
    updateElement('modal-title', 'mitLicense', 'MIT License');
    
    // 授權文本 - 比較長，特殊處理
    updateElement('license-full-text', 'mitLicenseText', 'MIT License Text');
    
    // GitHub 連結
    updateRepoLink();
    
    // 贊助開發者區塊
    updateCoffeeLink();
  }
  
  // 初始化彈出窗口
  function initializePopupPage() {
    // 部分標題
    updateElement('divider-title', 'dividerTitle', 'Divider');
    updateElement('reading-card-title', 'readingCardTitle', 'Reading Card');
    updateElement('note-title', 'noteTitle', 'Note');
    
    // 按鈕
    updateElement('addDivider', 'addDivider', 'Add Divider');
    updateElement('addBlock', 'addReadingCard', 'Add Reading Card');
    updateElement('addNote', 'addNote', 'Add Note');
    
    // 指導
    updateElement('instructions-title', 'instructionsTitle', 'Instructions');
    updateElement('instruction-drag', 'instructionDrag', 'Drag: Click and move elements');
    updateElement('instruction-delete', 'instructionDelete', 'Delete: Double-click elements');
    updateElement('instruction-resize', 'instructionResize', 'Resize: Drag corner handles');
    updateElement('instruction-note-input', 'instructionNoteInput', 'Edit note: Click to enter text');
    updateElement('instruction-auto-save', 'instructionAutoSave', 'Auto-save: No manual saving needed');
    
    // 錯誤信息
    updateElement('error-message-1', 'errorUnsupported', 'Not supported on this page');
    updateElement('error-message-2', 'errorUseOnRegular', 'Please use on regular web pages');
    
    // 版權連結
    const copyrightLink = document.getElementById('copyright-link');
    if (copyrightLink) {
      updateHTML('copyright-link', '?');
      updateAttribute('copyright-link', 'title', 'aboutLink', 'About FocusCut');
    }
    
    // 顏色按鈕
    const customColorButtons = ['dividerCustomColor', 'blockCustomColor', 'noteCustomColor'];
    for (let i = 0; i < customColorButtons.length; i++) {
      const button = document.getElementById(customColorButtons[i]);
      if (button) {
        button.innerHTML = '+';
        updateAttribute(customColorButtons[i], 'title', 'customColor', 'Custom Color');
      }
    }
    
    // 檢查並設置 Buy Me a Coffee 連結的文本
    updateCoffeeLink();
  }
  
  // 當頁面準備就緒時初始化
  function safeInit() {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(initializePage, 10);
        });
      } else {
        setTimeout(initializePage, 10);
      }
    } catch (e) {
      console.debug('Safe init error:', e);
    }
  }
  
  // 開始安全初始化
  safeInit();
})(); 