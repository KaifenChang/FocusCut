// FocusCut about page script - 僅處理模態窗口行為
document.addEventListener('DOMContentLoaded', function() {
  // 模態窗口操作
  try {
    var licenseLink = document.getElementById('license-value');
    var licenseModal = document.getElementById('license-modal');
    var closeBtn = document.querySelector('.close-btn');
    
    // 打開模態窗口
    licenseLink && licenseLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (licenseModal) {
        licenseModal.style.display = 'flex';
      }
    });
    
    // 關閉模態窗口
    closeBtn && closeBtn.addEventListener('click', function() {
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
      if (e.key === 'Escape' && licenseModal && licenseModal.style.display === 'flex') {
        licenseModal.style.display = 'none';
      }
    });
  } catch (e) {
    console.warn('設置模態窗口時發生錯誤:', e);
  }
}); 