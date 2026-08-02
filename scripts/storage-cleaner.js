/**
 * FocusCut Storage Cleaner Utility
 * ====================================
 * 
 * 功能說明：
 * - 開發者工具，用於清理擴展的存儲數據
 * - 可在開發者控制台中手動運行
 * - 提供精確的數據清理和查看功能
 * 
 * 使用方法：
 * 1. 在擴展頁面打開開發者控制台
 * 2. 複製這個腳本執行
 * 3. 調用所需的函數
 * 
 * 作者：KXii
 * 版本：v1.3
 */

// =============================================================================
// 存儲清理函數
// =============================================================================

/**
 * 清理特定網站的所有元素
 * @param {string} domain - 網站域名
 */
function cleanSiteStorage(domain) {
  console.log(`Starting cleanup for domain: ${domain}`);
  
  chrome.storage.local.get(null, function(items) {
    const keysToRemove = [];
    
    // 找出包含該域名的所有存儲項目
    for (let key in items) {
      if (key.includes(domain)) {
        keysToRemove.push(key);
      }
    }
    
    // 刪除找到的項目
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove, function() {
        console.log(`✅ Removed ${keysToRemove.length} items for domain ${domain}`);
        console.log('Removed keys:', keysToRemove);
      });
    } else {
      console.log(`ℹ️  No items found for domain ${domain}`);
    }
  });
}

/**
 * 清理所有存儲數據
 */
function cleanAllStorage() {
  chrome.storage.local.clear(function() {
    console.log('🗑️  All FocusCut storage data has been cleared');
  });
}

// =============================================================================
// 存儲查看函數
// =============================================================================

/**
 * 列出所有存儲的鍵值
 */
function listAllStorageKeys() {
  chrome.storage.local.get(null, function(items) {
    console.log('📋 All storage keys:');
    const keys = Object.keys(items);
    
    if (keys.length === 0) {
      console.log('   (No keys found)');
    } else {
      keys.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key}`);
      });
    }
    
    console.log(`\nTotal: ${keys.length} keys`);
  });
}

/**
 * 查看特定 URL 的數據
 * @param {string} url - 要查看的 URL
 */
function viewUrlData(url) {
  chrome.storage.local.get([url], function(result) {
    console.log(`🔍 Data for URL: ${url}`);
    
    if (result[url]) {
      console.log(result[url]);
    } else {
      console.log('   (No data found for this URL)');
    }
  });
}

/**
 * 顯示存儲統計信息
 */
function showStorageStats() {
  chrome.storage.local.get(null, function(items) {
    const keys = Object.keys(items);
    let totalSize = 0;
    
    // 計算大致的存儲大小
    for (let key in items) {
      totalSize += JSON.stringify(items[key]).length;
    }
    
    console.log('📊 Storage Statistics:');
    console.log(`   Total keys: ${keys.length}`);
    console.log(`   Approximate size: ${(totalSize / 1024).toFixed(2)} KB`);
    
    // 按域名分組統計
    const domainStats = {};
    keys.forEach(key => {
      try {
        const url = new URL(key);
        const domain = url.hostname;
        domainStats[domain] = (domainStats[domain] || 0) + 1;
      } catch (e) {
        domainStats['other'] = (domainStats['other'] || 0) + 1;
      }
    });
    
    console.log('\n📈 Keys by domain:');
    Object.entries(domainStats).forEach(([domain, count]) => {
      console.log(`   ${domain}: ${count} keys`);
    });
  });
}

// =============================================================================
// 使用說明
// =============================================================================

/**
 * 顯示使用說明
 */
function showHelp() {
  console.log(`
🔧 FocusCut Storage Cleaner - Available Commands:

📋 Data Viewing:
   listAllStorageKeys()          - List all storage keys
   viewUrlData('url')            - View data for specific URL
   showStorageStats()            - Show storage statistics

🗑️  Data Cleaning:
   cleanSiteStorage('domain')    - Clean data for specific domain
   cleanAllStorage()             - Clean all storage data

❓ Help:
   showHelp()                    - Show this help message

Example usage:
   cleanSiteStorage('example.com');
   viewUrlData('https://example.com/page');
   listAllStorageKeys();
  `);
}

// 顯示歡迎訊息
console.log('🛠️  FocusCut Storage Cleaner loaded. Type showHelp() for available commands.');
