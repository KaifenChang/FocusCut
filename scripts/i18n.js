/**
 * FocusCut Internationalization (i18n) Script
 * ================================================
 * 
 * 功能說明：
 * - 處理多語言國際化文本
 * - 安全地使用 Chrome 擴展 API
 * - 動態更新頁面元素文本
 * - 支援回退機制防止錯誤
 * 
 * 作者：KXii
 * 版本：v1.3
 */

(function() {
  'use strict';

  // =============================================================================
  // 核心功能函數
  // =============================================================================

  /**
   * 安全地獲取語言代碼
   * @returns {string} 語言代碼
   */
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

  /**
   * 安全地獲取翻譯文本
   * @param {string} key - 翻譯鍵值
   * @param {string} defaultText - 默認文本
   * @returns {string} 翻譯後的文本
   */
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

  // =============================================================================
  // DOM 更新函數
  // =============================================================================

  /**
   * 安全地更新頁面元素文本
   * @param {string} elementId - 元素 ID
   * @param {string} messageKey - 翻譯鍵值
   * @param {string} defaultText - 默認文本
   * @param {string} suffix - 後綴文本
   */
  function updateElement(elementId, messageKey, defaultText, suffix) {
    try {
      // 延遲操作，確保DOM已載入
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

  /**
   * 安全地更新 HTML 內容
   * @param {string} elementId - 元素 ID
   * @param {string} htmlContent - HTML 內容
   */
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

  /**
   * 安全地設置元素屬性
   * @param {string} elementId - 元素 ID
   * @param {string} attribute - 屬性名稱
   * @param {string} messageKey - 翻譯鍵值
   * @param {string} defaultText - 默認文本
   */
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

  // =============================================================================
  // 特殊功能更新函數
  // =============================================================================

  /**
   * 安全地處理 GitHub 連結
   */
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

  /**
   * 檢查並設置 Buy Me a Coffee 連結的文本
   */
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

  /**
   * 更新遮色片相關元素
   */
  function updateMaskElements() {
    try {
      setTimeout(function() {
        try {
          // 遮色片標題
          const readingMaskTitle = document.getElementById('reading-mask-title');
          if (readingMaskTitle) {
            readingMaskTitle.textContent = getMessage('readingMaskTitle', 'Reading Mask');
          }

          // 遮色片樣式標籤
          const maskStyleLabel = document.getElementById('mask-style-label');
          if (maskStyleLabel) {
            maskStyleLabel.textContent = getMessage('maskStyleLabel', 'Style');
          }

          // 遮色片樣式選項
          const styleOptions = document.querySelectorAll('.style-option');
          styleOptions.forEach(option => {
            const style = option.getAttribute('data-style');
            const spanElement = option.querySelector('span');
            
            if (spanElement) {
              const styleMessageMap = {
                'blur-gray': 'blurGrayStyle',
                'blur-dark': 'blurDarkStyle',
                'solid-gray': 'solidGrayStyle',
                'solid-dark': 'solidDarkStyle',
                'darker-blur-gray': 'darkerBlurGrayStyle'
              };
              
              const messageKey = styleMessageMap[style];
              if (messageKey) {
                spanElement.textContent = getMessage(messageKey, style);
              }
            }
          });
        } catch (innerError) {
          console.debug('Failed to update mask elements:', innerError);
        }
      }, 0);
    } catch (e) {
      console.debug('Error in updateMaskElements:', e);
    }
  }

  // =============================================================================
  // 頁面初始化函數
  // =============================================================================

  /**
   * 初始化關於頁面（現在是使用說明頁面）
   */
  function initializeAboutPage() {
    document.documentElement.lang = getLanguage().replace('_', '-');
    document.title = `FocusCut – ${getMessage('instructionsPageTitle', 'Instructions')}`;

    // 使用說明頁面標題
    updateElement('instructions-title', 'instructionsPageTitle', 'Instructions');
    
    // 使用說明內容
    updateElement('instruction-drag', 'instructionDrag', 'All elements can be dragged to adjust position');
    updateElement('instruction-delete', 'instructionDelete', 'Hover over elements to see delete button (top right)');
    updateElement('instruction-resize', 'instructionResize', 'Drag corner dots to resize elements');
    updateElement('instruction-lock', 'instructionLock', 'Pin cards to the screen with the lock button');
    updateElement('instruction-auto-save', 'instructionAutoSave', 'All changes are automatically saved');
    updateElement('about-tagline', 'aboutTagline', 'Focused reading · Visual assistance');
    
    // 驚嘆號按鈕提示
    updateAttribute('info-btn', 'title', 'aboutInfoTooltip', 'About FocusCut');
    
    // 返回按鈕
    updateElement('back-link', 'backLink', '← Back');
    
    // 關於彈窗內容
    updateElement('about-title', 'aboutLink', 'About FocusCut');
    updateElement('version-label', 'versionInfo', 'Version', ':');
    updateElement('developer-label', 'developer', 'Developer', ':');
    updateElement('license-label', 'licenseInfo', 'License', ':');
    updateElement('rights-reserved', 'allRightsReserved', 'All Rights Reserved');
    updateElement('license-value', 'mitLicense', 'MIT License');
    updateElement('modal-title', 'mitLicense', 'MIT License');
    
    // 授權文本
    updateElement('license-full-text', 'mitLicenseText', 'MIT License Text');
    
    // GitHub 連結
    updateRepoLink();
    
    // 贊助開發者區塊
    updateCoffeeLink();
  }

  /**
   * 初始化彈出窗口
   */
  function initializePopupPage() {
    document.documentElement.lang = getLanguage().replace('_', '-');

    // 功能標題
    updateElement('reading-card-title', 'readingCardTitle', 'Reading Card');
    updateElement('note-title', 'noteTitle', 'Note');
    updateElement('highlighter-title', 'highlighterTitle', 'Highlighter Box');
    updateElement('add-block-label', 'addAction', 'Add');
    updateElement('add-note-label', 'addAction', 'Add');
    updateElement('reading-mask-status', 'statusOff', 'Off');
    updateElement('highlighter-status', 'statusOff', 'Off');
    updateAttribute('toggle-reading-mask', 'aria-label', 'enableReadingMask', 'Enable reading mask');
    updateAttribute('toggle-highlighter', 'aria-label', 'enableHighlighter', 'Enable highlighter');
    updateAttribute('addBlock', 'aria-label', 'addReadingCard', 'Add reading card');
    updateAttribute('addNote', 'aria-label', 'addNote', 'Add sticky note');
    updateAttribute('clear-page-button', 'title', 'clearCurrentPage', 'Clear this page');
    updateAttribute('clear-page-button', 'aria-label', 'clearCurrentPage', 'Clear this page');
    
    // 遮色片相關元素
    updateMaskElements();
    
    // 錯誤訊息
    updateElement('error-message-1', 'errorUnsupported', 'Not supported on this page');
    updateElement('error-message-2', 'errorUseOnRegular', 'Please use on regular web pages');
    
    // 版權連結
    const copyrightLink = document.getElementById('copyright-link');
    if (copyrightLink) {
      updateHTML('copyright-link', '?');
      updateAttribute('copyright-link', 'title', 'aboutLink', 'About FocusCut');
    }
    
    // 贊助相關
    updateCoffeeLink();
  }

  /**
   * 初始化所有頁面元素
   */
  function initializePage() {
    try {
      // 根據當前頁面 URL 決定要初始化哪些元素
      const currentURL = window.location.href;
      
      // 檢測頁面類型
      const isPopupPage = currentURL.includes('popup.html');
      const isAboutPage = currentURL.includes('about.html');
      
      if (isAboutPage) {
        initializeAboutPage();
      } else if (isPopupPage) {
        initializePopupPage();
      }
    } catch (e) {
      console.debug('Failed to initialize page:', e);
    }
  }

  // =============================================================================
  // 初始化執行
  // =============================================================================

  /**
   * 當頁面準備就緒時安全初始化
   */
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
