// FocusCut about page script - 處理模態窗口行為
document.addEventListener('DOMContentLoaded', function() {
  try {
    // 咖啡emoji點擊事件
    var coffeeBtn = document.getElementById('coffee-btn');
    
    // 授權條款模態窗口
    var licenseLink = document.getElementById('license-value');
    var licenseModal = document.getElementById('license-modal');
    var closeLicenseBtn = document.getElementById('close-license');
    
    // 點擊咖啡emoji後顯示感謝訊息和贊助按鈕
    coffeeBtn && coffeeBtn.addEventListener('click', function() {
      // 檢查是否已經有感謝訊息，避免重複添加
      if (!document.getElementById('thank-you-message')) {
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
        
        const thankText = document.createElement('p');
        thankText.style.cssText = `
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #6c757d;
        `;
        thankText.innerHTML = '喜歡這個小工具嗎？<br>歡迎請我喝杯咖啡，感謝你的支持與鼓勵！';
        
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
        
        // hover 效果
        donateBtn.addEventListener('mouseenter', function() {
          this.style.backgroundColor = '#d0d0d0';
          this.style.color = '#444';
        });
        
        donateBtn.addEventListener('mouseleave', function() {
          this.style.backgroundColor = '#f0f0f0';
          this.style.color = '#666';
        });
        
        thankYouDiv.appendChild(thankText);
        thankYouDiv.appendChild(donateBtn);
        
        // 添加到版本資訊區域下方
        const versionInfo = document.querySelector('.version-info');
        if (versionInfo) {
          versionInfo.appendChild(thankYouDiv);
        }
      }
    });

    
    // 打開授權條款模態窗口
    licenseLink && licenseLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (licenseModal) {
        licenseModal.style.display = 'flex';
      }
    });
    
    // 關閉授權條款模態窗口
    closeLicenseBtn && closeLicenseBtn.addEventListener('click', function() {
      if (licenseModal) {
        licenseModal.style.display = 'none';
      }
    });
    
    // 點擊模態窗口外部區域關閉
    window.addEventListener('click', function(e) {
      if (e.target === licenseModal) {
        licenseModal.style.display = 'none';
      }
    });
    
    // 按ESC鍵關閉模態窗口
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (licenseModal && licenseModal.style.display === 'flex') {
          licenseModal.style.display = 'none';
        }
      }
    });
  } catch (e) {
    console.warn('設置模態窗口時發生錯誤:', e);
  }
}); 