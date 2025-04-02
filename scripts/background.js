// FocusCut 背景腳本 - 處理標籤頁更新和導航事件

console.log('FocusCut: Background script loaded');

// 監聽標籤頁更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 當頁面完成載入時
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('FocusCut: Tab updated', tabId, tab.url);
    
    // 向內容腳本發送頁面已更新的消息
    chrome.tabs.sendMessage(tabId, {
      action: 'pageUpdated',
      url: tab.url
    }).catch(err => {
      // 忽略因內容腳本尚未載入導致的錯誤
      console.log('FocusCut: Could not send message to content script (possibly not loaded yet)');
    });
  }
});

// 監聽標籤頁切換事件
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url) {
      console.log('FocusCut: Tab activated', activeInfo.tabId, tab.url);
      
      // 向內容腳本發送標籤頁已激活的消息
      chrome.tabs.sendMessage(activeInfo.tabId, {
        action: 'tabActivated',
        url: tab.url
      }).catch(err => {
        // 忽略因內容腳本尚未載入導致的錯誤
        console.log('FocusCut: Could not send message to content script (possibly not loaded yet)');
      });
    }
  });
});

// 處理來自內容腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'contentScriptLoaded') {
    console.log('FocusCut: Content script loaded in tab', sender.tab.id, sender.tab.url);
    sendResponse({ success: true });
  }
  return true;  // 使用非同步回覆
}); 