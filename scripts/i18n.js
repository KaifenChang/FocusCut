// FocusCut i18n localization script
document.addEventListener('DOMContentLoaded', () => {
  // Error messages
  document.getElementById('error-message-1').textContent = chrome.i18n.getMessage('errorUnsupported');
  document.getElementById('error-message-2').textContent = chrome.i18n.getMessage('errorUseOnRegular');
  
  // Section titles
  document.getElementById('divider-title').textContent = chrome.i18n.getMessage('dividerTitle');
  document.getElementById('reading-card-title').textContent = chrome.i18n.getMessage('readingCardTitle');
  document.getElementById('note-title').textContent = chrome.i18n.getMessage('noteTitle');
  
  // Buttons
  document.getElementById('addDivider').textContent = chrome.i18n.getMessage('addDivider');
  document.getElementById('addBlock').textContent = chrome.i18n.getMessage('addReadingCard');
  document.getElementById('addNote').textContent = chrome.i18n.getMessage('addNote');
  
  // Custom color buttons
  const customColorText = chrome.i18n.getMessage('customColor');
  document.getElementById('dividerCustomColor').title = customColorText;
  document.getElementById('blockCustomColor').title = customColorText;
  document.getElementById('noteCustomColor').title = customColorText;
  
  // Keep the "+" symbol for custom color buttons
  document.getElementById('dividerCustomColor').innerHTML = '+';
  document.getElementById('blockCustomColor').innerHTML = '+';
  document.getElementById('noteCustomColor').innerHTML = '+';
  
  // Instructions
  document.getElementById('instructions-title').textContent = chrome.i18n.getMessage('instructionsTitle');
  document.getElementById('instruction-drag').textContent = chrome.i18n.getMessage('instructionDrag');
  document.getElementById('instruction-delete').textContent = chrome.i18n.getMessage('instructionDelete');
  document.getElementById('instruction-resize').textContent = chrome.i18n.getMessage('instructionResize');
  document.getElementById('instruction-note-input').textContent = chrome.i18n.getMessage('instructionNoteInput');
  document.getElementById('instruction-auto-save').textContent = chrome.i18n.getMessage('instructionAutoSave');
  
  // Copyright link
  document.getElementById('copyright-link').innerHTML = '?';
  document.getElementById('copyright-link').title = chrome.i18n.getMessage('aboutLink');

  // 檢查 about.html
  if (window.location.href.includes('about.html')) {
    document.getElementById('title').textContent = chrome.i18n.getMessage('aboutTitle') || 'About FocusCut';
    document.getElementById('version-label').textContent = chrome.i18n.getMessage('versionLabel') || 'Version:';
    document.getElementById('developer-label').textContent = chrome.i18n.getMessage('developerLabel') || 'Developer:';
    document.getElementById('license-label').textContent = chrome.i18n.getMessage('licenseLabel') || 'License:';
    document.getElementById('developer-name').textContent = 'Kaifen Chang';
    document.getElementById('rights-reserved').textContent = chrome.i18n.getMessage('rightsReserved') || 'All Rights Reserved';
    document.getElementById('back-link').textContent = chrome.i18n.getMessage('backLink') || '← Back';
    document.getElementById('modal-title').textContent = chrome.i18n.getMessage('licenseTitle') || 'MIT License';
    document.getElementById('repo-link').textContent = chrome.i18n.getMessage('viewSourceCode') || '查看原始碼';
  }
}); 