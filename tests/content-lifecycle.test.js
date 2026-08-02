const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const contentScript = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'content.js'),
  'utf8'
);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.values = new Set();
  }

  setFromString(value) {
    this.values = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  add(...values) {
    values.forEach(value => this.values.add(value));
  }

  remove(...values) {
    values.forEach(value => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.classList = new FakeClassList(this);
    this.value = '';
    this.id = '';
    this._className = '';
  }

  set className(value) {
    this._className = value;
    this.classList.setFromString(value);
  }

  get className() {
    return this._className;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.ownerDocument.elements.add(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
    }
    this.parentNode = null;
    this.ownerDocument.elements.delete(this);
  }

  addEventListener() {}
  removeEventListener() {}

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  closest() {
    return null;
  }

  querySelectorAll(selector) {
    return this.ownerDocument.querySelectorAll(selector, this.children);
  }

  getBoundingClientRect() {
    const left = Number.parseFloat(this.style.left) || 0;
    const top = Number.parseFloat(this.style.top) || 0;
    const width = Number.parseFloat(this.style.width) || 0;
    const height = Number.parseFloat(this.style.height) || 0;
    return { left, top, width, height, right: left + width, bottom: top + height };
  }

  get offsetWidth() {
    return Number.parseFloat(this.style.width) || 0;
  }

  get offsetHeight() {
    return Number.parseFloat(this.style.height) || 0;
  }
}

function createDocument() {
  const listeners = new Map();
  const document = {
    readyState: 'loading',
    elements: new Set(),
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener() {},
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    getElementById(id) {
      return [...document.elements].find(element => element.id === id) || null;
    },
    querySelector(selector) {
      return document.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector, candidates = [...document.elements]) {
      const selectors = selector.split(',').map(value => value.trim());
      return candidates.filter(element => selectors.some(item => {
        if (item.startsWith('.')) return element.classList.contains(item.slice(1));
        if (item.startsWith('#')) return element.id === item.slice(1);
        return false;
      }));
    }
  };

  document.body = new FakeElement('body', document);
  document.elements.add(document.body);
  return document;
}

function createLocalStorage(initialData = {}) {
  const data = new Map(Object.entries(clone(initialData)));
  let setCalls = 0;

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      setCalls += 1;
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    has(key) {
      return data.has(key);
    },
    get setCalls() {
      return setCalls;
    }
  };
}

function createChromeStorage(initialData = {}) {
  const data = clone(initialData);

  return {
    data,
    api: {
      get(keys, callback) {
        const result = {};
        const requestedKeys = Array.isArray(keys) ? keys : Object.keys(data);
        requestedKeys.forEach(key => {
          if (Object.hasOwn(data, key)) result[key] = clone(data[key]);
        });
        queueMicrotask(() => callback(result));
      },
      set(items, callback) {
        Object.assign(data, clone(items));
        queueMicrotask(callback);
      },
      remove(keys, callback) {
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        keysToRemove.forEach(key => delete data[key]);
        queueMicrotask(callback);
      }
    }
  };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  throw new Error(message);
}

async function createHarness({ url, chromeData = {}, localData = {} }) {
  const document = createDocument();
  const localStorage = createLocalStorage(localData);
  const chromeStorage = createChromeStorage(chromeData);
  let intervalCount = 0;

  const window = {
    location: { href: url },
    innerHeight: 900,
    innerWidth: 1440,
    scrollX: 0,
    scrollY: 0,
    addEventListener() {},
    removeEventListener() {},
    getComputedStyle(element) {
      return element.style;
    },
    getSelection() {
      return { removeAllRanges() {}, toString: () => '', rangeCount: 0 };
    }
  };

  const context = vm.createContext({
    chrome: {
      runtime: {
        id: 'focuscut-test',
        lastError: null,
        sendMessage() {},
        onMessage: { addListener() {} }
      },
      storage: { local: chromeStorage.api },
      i18n: { getMessage: () => '' }
    },
    console: { log() {}, warn() {}, error() {} },
    document,
    getComputedStyle: element => element.style,
    localStorage,
    queueMicrotask,
    setInterval() {
      intervalCount += 1;
      return intervalCount;
    },
    setTimeout,
    clearInterval() {},
    window
  });

  vm.runInContext(contentScript, context, { filename: 'scripts/content.js' });
  await waitFor(
    () => vm.runInContext('state.isInitialized', context),
    'Content script did not initialize'
  );

  return { context, chromeStorage, localStorage, window, getIntervalCount: () => intervalCount };
}

test('first use saves only to extension-owned Chrome storage', async () => {
  const url = 'https://example.com/article';
  const harness = await createHarness({ url });

  await vm.runInContext(`(async () => {
    state.elements.notes.push({ text: 'private note', position: { x: 1, y: 2 } });
    await saveElements();
  })()`, harness.context);

  assert.equal(harness.localStorage.setCalls, 0);
  assert.equal(
    harness.chromeStorage.data[`focuscut_${url}`].notes[0].text,
    'private note'
  );
  assert.equal(vm.runInContext('state.isExtensionValid', harness.context), true);
});

test('legacy host localStorage is migrated before it is deleted', async () => {
  const url = 'https://example.com/legacy';
  const legacyKey = `focuscut_${url}`;
  const legacyData = {
    dividers: [],
    blocks: [],
    notes: [{ text: 'legacy note', color: '#fff', position: { x: 2, y: 3 } }],
    highlights: [],
    readingMask: null,
    highlighterBox: null
  };
  const harness = await createHarness({
    url,
    localData: { [legacyKey]: JSON.stringify(legacyData) }
  });

  assert.equal(harness.chromeStorage.data[legacyKey].notes[0].text, 'legacy note');
  assert.equal(harness.localStorage.has(legacyKey), false);
  assert.equal(harness.localStorage.setCalls, 0);
});

test('legacy unprefixed Chrome storage key is migrated without data loss', async () => {
  const url = 'https://example.com/chrome-legacy';
  const legacyData = {
    dividers: [],
    blocks: [],
    notes: [{ text: 'Chrome backup', color: '#fff', position: { x: 2, y: 3 } }],
    highlights: [],
    readingMask: null,
    highlighterBox: null
  };
  const harness = await createHarness({
    url,
    chromeData: { [url]: legacyData }
  });

  assert.equal(harness.chromeStorage.data[`focuscut_${url}`].notes[0].text, 'Chrome backup');
  assert.equal(Object.hasOwn(harness.chromeStorage.data, url), false);
});

test('legacy host data wins over its asynchronous Chrome backup', async () => {
  const url = 'https://example.com/conflicting-legacy-data';
  const makeData = text => ({
    dividers: [],
    blocks: [],
    notes: [{ text, color: '#fff', position: { x: 2, y: 3 } }],
    highlights: [],
    readingMask: null,
    highlighterBox: null
  });
  const harness = await createHarness({
    url,
    chromeData: { [url]: makeData('older backup') },
    localData: { [`focuscut_${url}`]: JSON.stringify(makeData('latest host copy')) }
  });

  assert.equal(
    harness.chromeStorage.data[`focuscut_${url}`].notes[0].text,
    'latest host copy'
  );
  assert.equal(harness.localStorage.has(`focuscut_${url}`), false);
  assert.equal(Object.hasOwn(harness.chromeStorage.data, url), false);
});

test('SPA navigation keeps initialization and loads the new page key', async () => {
  const firstUrl = 'https://example.com/app/one';
  const secondUrl = 'https://example.com/app/two';
  const makeData = text => ({
    dividers: [],
    blocks: [],
    notes: [{ text, color: '#fff', position: { x: 2, y: 3 } }],
    highlights: [],
    readingMask: null,
    highlighterBox: null
  });
  const harness = await createHarness({
    url: firstUrl,
    chromeData: {
      [`focuscut_${firstUrl}`]: makeData('first page'),
      [`focuscut_${secondUrl}`]: makeData('second page')
    }
  });

  assert.equal(vm.runInContext('state.elements.notes[0].text', harness.context), 'first page');

  harness.window.location.href = secondUrl;
  await vm.runInContext('handleUrlChange()', harness.context);

  assert.equal(vm.runInContext('state.isInitialized', harness.context), true);
  assert.equal(vm.runInContext('state.isExtensionValid', harness.context), true);
  assert.equal(vm.runInContext('state.currentUrl', harness.context), secondUrl);
  assert.equal(vm.runInContext('state.elements.notes[0].text', harness.context), 'second page');

  await vm.runInContext(`(async () => {
    state.elements.notes.push({ text: 'added after navigation', position: { x: 4, y: 5 } });
    await saveElements();
  })()`, harness.context);

  assert.equal(harness.chromeStorage.data[`focuscut_${firstUrl}`].notes.length, 1);
  assert.equal(harness.chromeStorage.data[`focuscut_${secondUrl}`].notes.length, 2);
  assert.equal(harness.getIntervalCount(), 1);
});

test('clearAll removes DOM, state, queued writes, and persisted page data', async () => {
  const url = 'https://example.com/clear-all';
  const storageKey = `focuscut_${url}`;
  const storedData = {
    dividers: [],
    blocks: [],
    notes: [{ text: 'must disappear', color: '#fff', position: { x: 2, y: 3 } }],
    highlights: [],
    readingMask: null,
    highlighterBox: null
  };
  const harness = await createHarness({
    url,
    chromeData: { [storageKey]: storedData }
  });

  const response = await vm.runInContext(`(async () => {
    state.elements.notes.push({ text: 'queued write', position: { x: 4, y: 5 } });
    saveElements();
    const clearResponse = new Promise(resolve => handleMessage({ action: 'clearAll' }, {}, resolve));
    state.elements.notes.push({ text: 'late write', position: { x: 6, y: 7 } });
    await saveElements();
    return clearResponse;
  })()`, harness.context);

  assert.equal(response.status, 'success');
  assert.equal(vm.runInContext('state.elements.notes.length', harness.context), 0);
  assert.equal(vm.runInContext('document.querySelectorAll(".focuscut-sticky-note").length', harness.context), 0);
  assert.equal(Object.hasOwn(harness.chromeStorage.data, storageKey), false);

  await vm.runInContext('loadSavedElements()', harness.context);
  assert.equal(vm.runInContext('state.elements.notes.length', harness.context), 0);
  assert.equal(Object.hasOwn(harness.chromeStorage.data, storageKey), false);
});
