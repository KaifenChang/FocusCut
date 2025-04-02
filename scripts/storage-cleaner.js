// FocusCut 儲存清理工具
// 這個腳本可以在開發者控制台中手動運行，用於清理特定網站的儲存數據

// 清理特定網站的所有元素
function cleanSiteStorage(domain) {
  console.log(`Starting cleanup for domain: ${domain}`);
  
  chrome.storage.local.get(null, function(items) {
    let keysToRemove = [];
    
    // 找出包含該域名的所有儲存項目
    for (let key in items) {
      if (key.includes(domain)) {
        keysToRemove.push(key);
      }
    }
    
    // 刪除找到的項目
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove, function() {
        console.log(`Removed ${keysToRemove.length} items for domain ${domain}`);
        console.log('Removed keys:', keysToRemove);
      });
    } else {
      console.log(`No items found for domain ${domain}`);
    }
  });
}

// 清理所有儲存數據
function cleanAllStorage() {
  chrome.storage.local.clear(function() {
    console.log('All FocusCut storage data has been cleared');
  });
}

// 列出所有儲存的鍵值
function listAllStorageKeys() {
  chrome.storage.local.get(null, function(items) {
    console.log('All storage keys:');
    for (let key in items) {
      console.log(key);
    }
  });
}

// 查看特定URL的數據
function viewUrlData(url) {
  chrome.storage.local.get([url], function(result) {
    console.log(`Data for URL: ${url}`);
    console.log(result[url]);
  });
}

// 使用方法：
// 1. 在擴展頁面打開開發者控制台
// 2. 複制這個腳本執行
// 3. 調用所需的函數，例如：
//    cleanSiteStorage('example.com');
//    cleanAllStorage();
//    listAllStorageKeys();
//    viewUrlData('https://example.com/page'); 