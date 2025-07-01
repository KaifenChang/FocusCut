// FocusCut about page script - 處理模態窗口行為
document.addEventListener('DOMContentLoaded', function() {
  try {
    // 驚嘆號按鈕和關於資訊模態窗口
    var infoBtn = document.getElementById('info-btn');
    var aboutModal = document.getElementById('about-modal');
    var closeAboutBtn = document.getElementById('close-about');
    
    // 授權條款模態窗口
    var licenseLink = document.getElementById('license-value');
    var licenseModal = document.getElementById('license-modal');
    var closeLicenseBtn = document.getElementById('close-license');
    
    // 打開關於資訊模態窗口
    infoBtn && infoBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (aboutModal) {
        aboutModal.style.display = 'flex';
      }
    });
    
    // 關閉關於資訊模態窗口
    closeAboutBtn && closeAboutBtn.addEventListener('click', function() {
      if (aboutModal) {
        aboutModal.style.display = 'none';
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
      if (e.target === aboutModal) {
        aboutModal.style.display = 'none';
      }
      if (e.target === licenseModal) {
        licenseModal.style.display = 'none';
      }
    });
    
    // 按ESC鍵關閉模態窗口
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (aboutModal && aboutModal.style.display === 'flex') {
          aboutModal.style.display = 'none';
        }
        if (licenseModal && licenseModal.style.display === 'flex') {
          licenseModal.style.display = 'none';
        }
      }
    });
  } catch (e) {
    console.warn('設置模態窗口時發生錯誤:', e);
  }
}); 