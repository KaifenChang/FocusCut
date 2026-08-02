const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');
const popupHtml = fs.readFileSync(path.join(projectRoot, 'popup.html'), 'utf8');
const popupScript = fs.readFileSync(path.join(projectRoot, 'scripts', 'popup.js'), 'utf8');

test('popup distinguishes actions and colors without redundant toggle text', () => {
  assert.match(popupHtml, /id="add-block-label"/);
  assert.match(popupHtml, /id="add-note-label"/);
  assert.doesNotMatch(popupHtml, /id="reading-mask-status"/);
  assert.doesNotMatch(popupHtml, /id="highlighter-status"/);
  assert.match(popupHtml, /id="toggle-reading-mask"[^>]+aria-labelledby="reading-mask-title"/);
  assert.match(popupHtml, /id="toggle-highlighter"[^>]+aria-labelledby="highlighter-title"/);
  assert.match(popupHtml, /\.toggle-switch\s*\{[^}]*height:\s*30px/s);
  assert.match(popupHtml, /\.toggle-label\s*\{[^}]*height:\s*22px/s);
  assert.match(popupHtml, /\.toggle-slider\s*\{[^}]*bottom:\s*0/s);
  assert.equal((popupHtml.match(/<button[^>]+class="color-preset/g) || []).length, 12);
  assert.match(popupHtml, /aria-pressed="true"/);
  assert.match(popupScript, /setAttribute\('aria-pressed', 'true'\)/);
  assert.doesNotMatch(popupScript, /updateToggleState/);
  assert.match(popupScript, /isPreviewMode/);
  assert.doesNotMatch(popupHtml, /content:\s*['"]✓['"]/);
  assert.doesNotMatch(popupHtml, /#5f8f79|#527d6a|#7da892/i);
  assert.match(popupHtml, /class="highlighter-preview-icon"/);
  assert.match(popupHtml, /class="popup-footer"/);
  assert.match(popupHtml, /id="clear-page-button"/);
  assert.match(popupScript, /action:\s*'clearAll'/);
  assert.match(popupScript, /clearCurrentPageConfirm/);
  assert.match(popupScript, /要清除目前頁面的所有 FocusCut 內容嗎？此操作無法復原。/);
  assert.match(popupScript, /isChineseInterface/);
  assert.match(popupScript, /window\.confirm\(copy\.confirm\)/);
  assert.doesNotMatch(popupHtml, /\.copyright-link\s*\{[^}]*position:\s*fixed/s);
  assert.match(popupHtml, /linear-gradient\(/);
  assert.match(popupHtml, /rgba\(255, 255, 0, 0\.2\)/);
  assert.match(popupHtml, /rgba\(255, 128, 0, 0\.2\)/);
  assert.match(popupHtml, /rgba\(0, 255, 0, 0\.2\)/);
});

test('visible default mask choice matches the style sent to the page', () => {
  assert.match(popupHtml, /id="maskColor"[^>]+value="#f5f5f5"/);
  assert.match(popupHtml, /class="color-preset selected"[^>]+data-style="white-blur"/);
  assert.match(popupScript, /style: 'white-blur'/);
  assert.match(popupScript, /color: 'rgba\(245, 245, 245, 0\.4\)'/);
});
