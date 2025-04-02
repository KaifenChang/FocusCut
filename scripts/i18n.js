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
}); 