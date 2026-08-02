const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');
const contentCss = fs.readFileSync(path.join(projectRoot, 'styles', 'content.css'), 'utf8');
const contentScript = fs.readFileSync(path.join(projectRoot, 'scripts', 'content.js'), 'utf8');

function readZIndex(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = contentCss.match(new RegExp(`${escapedSelector}[^}]*z-index:\\s*(\\d+)`, 's'));
  assert.ok(match, `Missing z-index for ${selector}`);
  return Number(match[1]);
}

test('reading mask stays below every FocusCut content layer', () => {
  const mask = readZIndex('.focuscut-reading-mask-bottom');
  const highlighter = readZIndex('.focuscut-highlighter');
  const block = readZIndex('.focuscut-block');
  const divider = readZIndex('.focuscut-divider');
  const note = readZIndex('.focuscut-sticky-note');
  const controls = readZIndex('.focuscut-reading-mask-controls');

  assert.ok(mask < highlighter);
  assert.ok(highlighter < block);
  assert.ok(block < divider);
  assert.ok(divider < note);
  assert.ok(note < controls);
});

test('content script does not override the centralized layer order', () => {
  assert.doesNotMatch(contentScript, /(?:readingMaskTop|readingMaskBottom|readingMaskControls|divider|block|note)\.style\.zIndex/);
});
