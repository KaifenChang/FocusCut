const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const messagingSource = fs.readFileSync(
  path.join(projectRoot, 'scripts', 'tab-messaging.js'),
  'utf8'
);

function loadMessaging() {
  const context = vm.createContext({ URL, setTimeout, clearTimeout });
  vm.runInContext(messagingSource, context);
  return context.FocusCutTabMessaging;
}

test('reinjects the current content files and retries when the receiver is missing', async () => {
  const messaging = loadMessaging();
  let sendCount = 0;
  const injected = [];
  const chromeApi = {
    tabs: {
      query: async () => [{ id: 42, url: 'https://example.com/article' }],
      sendMessage: async () => {
        sendCount += 1;
        if (sendCount <= 2) {
          throw new Error('Could not establish connection. Receiving end does not exist.');
        }
        return { status: 'success' };
      }
    },
    scripting: {
      insertCSS: async details => injected.push(['css', details]),
      executeScript: async details => injected.push(['script', details])
    }
  };

  const response = await messaging.sendMessageToActiveTab(
    { action: 'addNote', color: '#fff' },
    chromeApi,
    { retryDelay: 0, retryCount: 2 }
  );

  assert.equal(response.status, 'success');
  assert.equal(sendCount, 3);
  assert.equal(injected[0][0], 'css');
  assert.equal(injected[0][1].files[0], 'styles/content.css');
  assert.equal(injected[1][0], 'script');
  assert.equal(injected[1][1].files[0], 'scripts/content.js');
});

test('does not inject into Chrome internal pages', async () => {
  const messaging = loadMessaging();
  let injectionCount = 0;
  const chromeApi = {
    tabs: {
      query: async () => [{ id: 7, url: 'chrome://extensions/' }],
      sendMessage: async () => ({ status: 'success' })
    },
    scripting: {
      insertCSS: async () => { injectionCount += 1; },
      executeScript: async () => { injectionCount += 1; }
    }
  };

  await assert.rejects(
    messaging.sendMessageToActiveTab({ action: 'addNote' }, chromeApi),
    error => error.code === 'UNSUPPORTED_PAGE'
  );
  assert.equal(injectionCount, 0);
});

test('manifest and popup include the recovery dependencies', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'manifest.json'), 'utf8'));
  const popup = fs.readFileSync(path.join(projectRoot, 'popup.html'), 'utf8');
  const popupScript = fs.readFileSync(path.join(projectRoot, 'scripts', 'popup.js'), 'utf8');

  assert.ok(manifest.permissions.includes('scripting'));
  assert.match(popup, /scripts\/tab-messaging\.js/);
  assert.doesNotMatch(popupScript, /chrome\.tabs\.sendMessage/);
});

test('expected extension-update invalidation is handled silently', () => {
  const contentScript = fs.readFileSync(
    path.join(projectRoot, 'scripts', 'content.js'),
    'utf8'
  );

  assert.match(contentScript, /isExtensionContextInvalidatedError\(error\)/);
  assert.doesNotMatch(contentScript, /Extension was updated; the page will reconnect/);
});
