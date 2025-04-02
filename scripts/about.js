// FocusCut about page i18n script
document.addEventListener('DOMContentLoaded', () => {
  // Set page title
  document.title = chrome.i18n.getMessage('copyright');
  
  // Set content
  document.getElementById('title').textContent = chrome.i18n.getMessage('aboutLink');
  document.getElementById('version-label').textContent = chrome.i18n.getMessage('versionInfo') + ':';
  document.getElementById('developer-label').textContent = chrome.i18n.getMessage('developer') + ':';
  document.getElementById('license-label').textContent = chrome.i18n.getMessage('licenseInfo') + ':';
  document.getElementById('license-value').textContent = chrome.i18n.getMessage('mitLicense');
  document.getElementById('license-full-text').textContent = chrome.i18n.getMessage('mitLicenseText');
  document.getElementById('modal-title').textContent = chrome.i18n.getMessage('mitLicense');
  document.getElementById('rights-reserved').textContent = chrome.i18n.getMessage('allRightsReserved');
  document.getElementById('developer-name').textContent = chrome.i18n.getMessage('developerName');
  document.getElementById('repo-link').textContent = chrome.i18n.getMessage('viewSourceCode') || '查看原始碼';
  
  // 模態窗口操作
  const licenseLink = document.getElementById('license-value');
  const licenseModal = document.getElementById('license-modal');
  const closeBtn = document.querySelector('.close-btn');
  
  // 打開模態窗口
  licenseLink.addEventListener('click', (e) => {
    e.preventDefault();
    licenseModal.style.display = 'flex';
  });
  
  // 關閉模態窗口
  closeBtn.addEventListener('click', () => {
    licenseModal.style.display = 'none';
  });
  
  // 點擊模態窗口外部區域關閉
  window.addEventListener('click', (e) => {
    if (e.target === licenseModal) {
      licenseModal.style.display = 'none';
    }
  });
  
  // 按ESC鍵關閉模態窗口
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && licenseModal.style.display === 'flex') {
      licenseModal.style.display = 'none';
    }
  });
}); 