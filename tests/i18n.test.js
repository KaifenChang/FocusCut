const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');
const aboutHtml = fs.readFileSync(path.join(projectRoot, 'about.html'), 'utf8');
const i18nScript = fs.readFileSync(path.join(projectRoot, 'scripts', 'i18n.js'), 'utf8');
const aboutScript = fs.readFileSync(path.join(projectRoot, 'scripts', 'about.js'), 'utf8');

const visibleAboutIds = [
  'instructions-title',
  'instruction-drag',
  'instruction-resize',
  'instruction-delete',
  'instruction-lock',
  'instruction-auto-save',
  'back-link',
  'about-tagline'
];

const requiredLocaleKeys = [
  'instructionsPageTitle',
  'instructionDrag',
  'instructionResize',
  'instructionDelete',
  'instructionLock',
  'instructionAutoSave',
  'backLink',
  'aboutTagline',
  'sponsorMessage',
  'buyMeCoffee'
];

test('every visible instructions-page field has an i18n target', () => {
  visibleAboutIds.forEach(id => {
    assert.match(aboutHtml, new RegExp(`id=["']${id}["']`));
    assert.match(i18nScript, new RegExp(`["']${id}["']`));
  });
});

test('all supported locales contain the instructions-page messages', () => {
  ['en', 'zh_TW', 'zh_CN'].forEach(locale => {
    const messages = JSON.parse(
      fs.readFileSync(path.join(projectRoot, '_locales', locale, 'messages.json'), 'utf8')
    );

    requiredLocaleKeys.forEach(key => {
      assert.equal(typeof messages[key]?.message, 'string', `${locale} is missing ${key}`);
      assert.notEqual(messages[key].message.trim(), '', `${locale}.${key} is empty`);
    });
  });
});

test('coffee prompt and action text use locale messages', () => {
  assert.match(aboutScript, /getLocalizedMessage\(\s*['"]sponsorMessage['"]/);
  assert.match(aboutScript, /getLocalizedMessage\(['"]buyMeCoffee['"]/);
  assert.doesNotMatch(aboutScript, /喜歡這個小工具嗎/);
});
