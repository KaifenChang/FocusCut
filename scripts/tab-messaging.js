/**
 * Popup-to-tab messaging with automatic content-script recovery.
 * When an unpacked extension is reloaded, scripts in already-open pages lose
 * their extension context. The next popup action reinjects the current files.
 */
(function initializeTabMessaging(global) {
  const CONTENT_SCRIPT_FILE = 'scripts/content.js';
  const CONTENT_STYLE_FILE = 'styles/content.css';
  const DEFAULT_RETRY_DELAY = 50;
  const DEFAULT_RETRY_COUNT = 10;
  let injectionPromise = null;

  function getErrorMessage(error) {
    return error?.message || String(error || 'Unknown error');
  }

  function isMissingReceiverError(error) {
    const message = getErrorMessage(error);
    return message.includes('Receiving end does not exist') ||
      message.includes('Could not establish connection');
  }

  function isSupportedPageUrl(url) {
    if (typeof url !== 'string' || !url) {
      return false;
    }

    try {
      const parsedUrl = new URL(url);
      const isSupportedProtocol = ['http:', 'https:', 'file:', 'ftp:'].includes(parsedUrl.protocol);
      const isChromeWebStore = parsedUrl.hostname === 'chromewebstore.google.com' ||
        (parsedUrl.hostname === 'chrome.google.com' && parsedUrl.pathname.startsWith('/webstore'));
      return isSupportedProtocol && !isChromeWebStore;
    } catch (error) {
      return false;
    }
  }

  async function getActiveTab(chromeApi = chrome) {
    const tabs = await chromeApi.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    if (!tab?.id) {
      throw new Error('No active tab found');
    }
    return tab;
  }

  function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async function injectContentScript(tabId, chromeApi) {
    await chromeApi.scripting.insertCSS({
      target: { tabId },
      files: [CONTENT_STYLE_FILE]
    });
    await chromeApi.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE]
    });
  }

  async function ensureContentScript(tabId, chromeApi) {
    if (!injectionPromise) {
      injectionPromise = injectContentScript(tabId, chromeApi)
        .finally(() => {
          injectionPromise = null;
        });
    }
    return injectionPromise;
  }

  async function retryMessage(tabId, message, chromeApi, retryDelay, retryCount) {
    let lastError;
    for (let attempt = 0; attempt < retryCount; attempt += 1) {
      if (retryDelay > 0) {
        await wait(retryDelay);
      }
      try {
        return await chromeApi.tabs.sendMessage(tabId, message);
      } catch (error) {
        if (!isMissingReceiverError(error)) {
          throw error;
        }
        lastError = error;
      }
    }
    throw lastError || new Error('Content script did not become ready');
  }

  async function sendMessageToActiveTab(
    message,
    chromeApi = chrome,
    options = {}
  ) {
    const tab = await getActiveTab(chromeApi);
    if (!isSupportedPageUrl(tab.url)) {
      const error = new Error('FocusCut cannot run on this page');
      error.code = 'UNSUPPORTED_PAGE';
      throw error;
    }

    try {
      return await chromeApi.tabs.sendMessage(tab.id, message);
    } catch (error) {
      if (!isMissingReceiverError(error)) {
        throw error;
      }
    }

    const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
    const retryCount = options.retryCount ?? DEFAULT_RETRY_COUNT;

    // The declarative content script may still be starting. Retry once before
    // injecting so a normal page load cannot cause a duplicate execution.
    try {
      return await retryMessage(tab.id, message, chromeApi, retryDelay, 1);
    } catch (error) {
      if (!isMissingReceiverError(error)) {
        throw error;
      }
    }

    await ensureContentScript(tab.id, chromeApi);
    return retryMessage(tab.id, message, chromeApi, retryDelay, retryCount);
  }

  global.FocusCutTabMessaging = Object.freeze({
    getActiveTab,
    isMissingReceiverError,
    isSupportedPageUrl,
    sendMessageToActiveTab
  });
})(globalThis);
