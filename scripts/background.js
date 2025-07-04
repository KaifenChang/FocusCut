/**
 * FocusOverlay Background Script
 * ==============================
 * 
 * 功能說明：
 * - 監聽標籤頁更新和導航事件
 * - 處理來自內容腳本的消息
 * - 管理擴展的全域狀態
 * 
 * 作者：KXii
 * 版本：v1.1
 */

console.log('FocusCut: Background script loaded');

// =============================================================================
// 標籤頁事件監聽
// =============================================================================

/**
 * 監聽標籤頁更新事件
 * 當頁面完成載入時通知內容腳本
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 檢查頁面是否完成載入且有有效 URL
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('FocusCut: Tab updated', tabId, tab.url);
    
    // 通知內容腳本頁面已更新
    sendMessageToContentScript(tabId, {
      action: 'pageUpdated',
      url: tab.url
    });
  }
});

/**
 * 監聽標籤頁切換事件
 * 當用戶切換到不同標籤頁時通知內容腳本
 */
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url) {
      console.log('FocusCut: Tab activated', activeInfo.tabId, tab.url);
      
      // 通知內容腳本標籤頁已激活
      sendMessageToContentScript(activeInfo.tabId, {
        action: 'tabActivated',
        url: tab.url
      });
    }
  });
});

// =============================================================================
// 消息處理
// =============================================================================

/**
 * 處理來自內容腳本的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptLoaded') {
    console.log('FocusCut: Content script loaded in tab', sender.tab.id, sender.tab.url);
    sendResponse({ success: true });
  }
  
  // 保持消息通道開放以支援異步回應
  return true;
});

// =============================================================================
// 輔助函數
// =============================================================================

/**
 * 安全地向內容腳本發送消息
 * @param {number} tabId - 標籤頁 ID
 * @param {Object} message - 要發送的消息對象
 */
function sendMessageToContentScript(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(err => {
    // 忽略因內容腳本尚未載入導致的錯誤
    console.log('FocusCut: Could not send message to content script (possibly not loaded yet)');
  });
} 