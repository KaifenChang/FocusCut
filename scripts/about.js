/**
 * FocusOverlay About Page Script
 * ==============================
 * 
 * 功能說明：
 * - 處理關於頁面的模態窗口行為
 * - 管理咖啡贊助按鈕的互動
 * - 處理授權條款模態窗口
 * - 處理鍵盤和滑鼠事件
 * 
 * 作者：KXii
 * 版本：v1.1
 */

// =============================================================================
// 頁面初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
  try {
    // 獲取 DOM 元素
    const coffeeBtn = document.getElementById('coffee-btn');
    const licenseLink = document.getElementById('license-value');
    const licenseModal = document.getElementById('license-modal');
    const closeLicenseBtn = document.getElementById('close-license');

    // 設置各種互動功能
    setupCoffeeButton(coffeeBtn);
    setupLicenseModal(licenseLink, licenseModal, closeLicenseBtn);
    setupGlobalEventListeners(licenseModal);
    
  } catch (e) {
    console.warn('設置模態窗口時發生錯誤:', e);
  }
});

// =============================================================================
// 咖啡贊助功能
// =============================================================================

/**
 * 設置咖啡贊助按鈕的互動功能
 * @param {HTMLElement} coffeeBtn - 咖啡按鈕元素
 */
function setupCoffeeButton(coffeeBtn) {
  if (!coffeeBtn) return;

  coffeeBtn.addEventListener('click', function() {
    const existingMessage = document.getElementById('thank-you-message');
    
    if (existingMessage) {
      // 如果已存在，移除訊息（收起來）
      existingMessage.remove();
    } else {
      // 如果不存在，創建並顯示贊助訊息
      createThankYouMessage();
    }
  });
}

/**
 * 創建感謝訊息和贊助按鈕
 */
function createThankYouMessage() {
  // 創建主容器
  const thankYouDiv = document.createElement('div');
  thankYouDiv.id = 'thank-you-message';
  thankYouDiv.style.cssText = `
    text-align: center;
    margin-top: 15px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  `;
  
  // 創建感謝文字
  const thankText = document.createElement('p');
  thankText.style.cssText = `
    margin: 0 0 10px 0;
    font-size: 12px;
    color: #6c757d;
  `;
  thankText.innerHTML = '喜歡這個小工具嗎？<br>歡迎請我喝杯咖啡，感謝你的支持與鼓勵！';
  
  // 創建贊助按鈕
  const donateBtn = document.createElement('a');
  donateBtn.href = 'https://buymeacoffee.com/kxii';
  donateBtn.target = '_blank';
  donateBtn.style.cssText = `
    display: inline-block;
    background-color: #f0f0f0;
    color: #666;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    margin-top: 5px;
    transition: all 0.2s ease;
    border: 1px solid #ddd;
  `;
  donateBtn.innerHTML = 'Buy Me a Coffee ↗';
  
  // 添加按鈕懸停效果
  setupButtonHoverEffects(donateBtn);
  
  // 組裝元素
  thankYouDiv.appendChild(thankText);
  thankYouDiv.appendChild(donateBtn);
  
  // 添加到版本資訊區域下方
  const versionInfo = document.querySelector('.version-info');
  if (versionInfo) {
    versionInfo.appendChild(thankYouDiv);
  }
}

/**
 * 設置按鈕懸停效果
 * @param {HTMLElement} button - 按鈕元素
 */
function setupButtonHoverEffects(button) {
  button.addEventListener('mouseenter', function() {
    this.style.backgroundColor = '#d0d0d0';
    this.style.color = '#444';
  });
  
  button.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#f0f0f0';
    this.style.color = '#666';
  });
}

// =============================================================================
// 授權條款模態窗口
// =============================================================================

/**
 * 設置授權條款模態窗口的互動功能
 * @param {HTMLElement} licenseLink - 授權條款連結
 * @param {HTMLElement} licenseModal - 授權條款模態窗口
 * @param {HTMLElement} closeLicenseBtn - 關閉按鈕
 */
function setupLicenseModal(licenseLink, licenseModal, closeLicenseBtn) {
  // 打開模態窗口
  if (licenseLink) {
    licenseLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (licenseModal) {
        licenseModal.style.display = 'flex';
      }
    });
  }
  
  // 關閉模態窗口
  if (closeLicenseBtn) {
    closeLicenseBtn.addEventListener('click', function() {
      if (licenseModal) {
        licenseModal.style.display = 'none';
      }
    });
  }
}

// =============================================================================
// 全域事件監聽器
// =============================================================================

/**
 * 設置全域事件監聽器（點擊外部區域和按 ESC 鍵關閉模態窗口）
 * @param {HTMLElement} licenseModal - 授權條款模態窗口
 */
function setupGlobalEventListeners(licenseModal) {
  // 點擊模態窗口外部區域關閉
  window.addEventListener('click', function(e) {
    if (e.target === licenseModal) {
      licenseModal.style.display = 'none';
    }
  });
  
  // 按 ESC 鍵關閉模態窗口
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (licenseModal && licenseModal.style.display === 'flex') {
        licenseModal.style.display = 'none';
      }
    }
  });
} 