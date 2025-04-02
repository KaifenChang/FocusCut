// 儲存所有元素的位置和內容
let elements = {
  dividers: [],
  blocks: [],
  notes: []
};

// 確保在頁面變化時重新加載元素
let currentUrl = window.location.href;

// 通知背景腳本，內容腳本已載入
chrome.runtime.sendMessage({ action: 'contentScriptLoaded', url: window.location.href });

// 監聽來自背景腳本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageUpdated') {
    console.log('FocusCut: Received pageUpdated message with URL:', request.url);
    if (request.url !== currentUrl) {
      console.log('FocusCut: URL changed (from background) from', currentUrl, 'to', request.url);
      currentUrl = request.url;
      
      // 重新加載當前URL的元素
      handleUrlChange();
    }
    sendResponse({ success: true });
  } else if (request.action === 'tabActivated') {
    console.log('FocusCut: Tab activated with URL:', request.url);
    // 確保元素與當前頁面匹配
    if (currentUrl !== request.url) {
      currentUrl = request.url;
      handleUrlChange();
    }
    sendResponse({ success: true });
  } else if (request.action === 'addDivider') {
    addDivider(request.color);
    console.log('FocusCut Content: Divider added');
    sendResponse({ success: true });
  } else if (request.action === 'addBlock') {
    addBlock(request.color);
    console.log('FocusCut Content: Reading card added');
    sendResponse({ success: true });
  } else if (request.action === 'addNote') {
    addNote(request.color);
    console.log('FocusCut Content: Note added');
    sendResponse({ success: true });
  }
  return true; // 使用非同步回應
});

// 處理URL變化
function handleUrlChange() {
  // 清除當前元素
  clearAllElements();
  elements = { dividers: [], blocks: [], notes: [] };
  
  // 延遲加載新URL的元素，確保頁面已完全更新
  setTimeout(loadSavedElements, 300);
}

// 頁面內URL變化監聽（對於SPA網站）
setInterval(() => {
  if (currentUrl !== window.location.href) {
    console.log('FocusCut: URL changed (from interval) from', currentUrl, 'to', window.location.href);
    currentUrl = window.location.href;
    handleUrlChange();
  }
}, 500); // 每500毫秒檢查一次URL變化

// 歷史記錄事件監聽（前進/後退按鈕）
window.addEventListener('popstate', () => {
  console.log('FocusCut: History state changed (popstate event)');
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    handleUrlChange();
  }
});

// 監聽頁面卸載事件
window.addEventListener('beforeunload', () => {
  console.log('FocusCut: Page unloading, saving current elements');
  saveElements(); // 確保在頁面卸載前保存元素
});

// 獲取當前頁面的唯一標識符
function getCurrentPageKey() {
  return currentUrl; // 使用當前URL，而不是window.location.href，確保一致性
}

// 從 storage 載入已保存的元素
function loadSavedElements() {
  const pageKey = getCurrentPageKey();
  console.log('FocusCut: Loading elements for URL:', pageKey);
  
  // 先清除頁面上的所有現有元素
  clearAllElements();
  
  // 使用chrome.storage.local API獲取數據
  chrome.storage.local.get([pageKey], function(result) {
    if (result && result[pageKey]) {
      try {
        const data = result[pageKey];
        // 確保我們有一個有效的JSON字符串或對象
        elements = typeof data === 'string' ? JSON.parse(data) : data;
        
        // 確保元素對象的結構正確
        if (!elements.dividers) elements.dividers = [];
        if (!elements.blocks) elements.blocks = [];
        if (!elements.notes) elements.notes = [];
        
        console.log(`FocusCut: Found ${elements.dividers.length} dividers, ${elements.blocks.length} blocks, ${elements.notes.length} notes for ${pageKey}`);
        
        // 創建保存的元素
        elements.dividers.forEach(divider => createDivider(divider));
        elements.blocks.forEach(block => createBlock(block));
        elements.notes.forEach(note => createNote(note));
        
        console.log(`FocusCut: Successfully loaded elements for ${pageKey}`);
      } catch (error) {
        console.error('FocusCut: Error loading saved elements', error);
        
        // 重置元素並清除可能損壞的數據
        elements = { dividers: [], blocks: [], notes: [] };
        chrome.storage.local.remove([pageKey]);
      }
    } else {
      console.log('FocusCut: No saved elements found for this URL');
      
      // 確保開始使用乾淨的空列表
      elements = { dividers: [], blocks: [], notes: [] };
    }
  });
}

// 清除頁面上的所有元素
function clearAllElements() {
  const focuscutElements = document.querySelectorAll('.focuscut-divider, .focuscut-block, .focuscut-sticky-note');
  console.log('FocusCut: Clearing', focuscutElements.length, 'existing elements');
  
  focuscutElements.forEach(el => {
    el.remove();
  });
}

// 保存元素到 storage
function saveElements() {
  const pageKey = getCurrentPageKey();
  
  // 確保元素結構正確
  if (!elements.dividers) elements.dividers = [];
  if (!elements.blocks) elements.blocks = [];
  if (!elements.notes) elements.notes = [];
  
  // 簡化數據以減少存儲大小
  const cleanedDividers = elements.dividers.map(d => ({
    color: d.color,
    position: d.position,
    width: d.width
  }));
  
  const cleanedBlocks = elements.blocks.map(b => ({
    color: b.color,
    position: b.position,
    size: b.size
  }));
  
  const cleanedNotes = elements.notes.map(n => ({
    text: n.text,
    color: n.color,
    position: n.position,
    width: n.width,
    height: n.height
  }));
  
  const cleanedElements = {
    dividers: cleanedDividers,
    blocks: cleanedBlocks,
    notes: cleanedNotes
  };
  
  // 使用chrome.storage.local API保存數據
  const dataObj = {};
  dataObj[pageKey] = cleanedElements;
  
  chrome.storage.local.set(dataObj, function() {
    if (chrome.runtime.lastError) {
      console.error('FocusCut: Error saving data', chrome.runtime.lastError);
    } else {
      console.log(`FocusCut: Saved ${cleanedElements.dividers.length} dividers, ${cleanedElements.blocks.length} blocks, ${cleanedElements.notes.length} notes for URL: ${pageKey}`);
    }
  });
  
  // 更新全局變量
  elements = cleanedElements;
}

// Base64 編碼字符串，安全地儲存URL
function safeEncodeURL(url) {
  // 直接使用encodeURIComponent來處理URL，避免特殊字符問題
  return encodeURIComponent(url);
}

// 創建分隔線
function createDivider(dividerData) {
  const divider = document.createElement('div');
  divider.className = 'focuscut-divider';
  divider.style.backgroundColor = dividerData.color;
  divider.style.position = 'absolute';
  divider.style.left = dividerData.position.x + 'px';
  divider.style.top = dividerData.position.y + 'px';
  divider.style.width = (dividerData.width || '100%');
  divider.style.zIndex = '9999';
  
  const deleteButton = document.createElement('div');
  deleteButton.className = 'focuscut-delete-button';
  deleteButton.innerHTML = '×';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    divider.remove();
    elements.dividers = elements.dividers.filter(d => d !== dividerData);
    saveElements();
  });
  divider.appendChild(deleteButton);
  
  const resizer = document.createElement('div');
  resizer.className = 'focuscut-resizer';
  resizer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    initResize(e, divider, dividerData, 'width');
  });
  divider.appendChild(resizer);
  
  makeDraggable(divider, dividerData);
  
  document.body.appendChild(divider);
  return divider;
}

// 創建色卡
function createBlock(blockData) {
  const block = document.createElement('div');
  block.className = 'focuscut-block';
  
  const color = blockData.color || '#ff6b6b';
  const rgbaColor = convertToRGBA(color, 0.15);
  block.style.backgroundColor = rgbaColor;
  
  block.style.position = 'absolute';
  block.style.left = blockData.position.x + 'px';
  block.style.top = blockData.position.y + 'px';
  block.style.width = (blockData.size.width || 200) + 'px';
  block.style.height = (blockData.size.height || 100) + 'px';
  block.style.zIndex = '9998';
  
  const deleteButton = document.createElement('div');
  deleteButton.className = 'focuscut-delete-button';
  deleteButton.innerHTML = '×';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    block.remove();
    elements.blocks = elements.blocks.filter(b => b !== blockData);
    saveElements();
  });
  block.appendChild(deleteButton);
  
  const resizer = document.createElement('div');
  resizer.className = 'focuscut-resizer focuscut-resizer-both';
  resizer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    initResize(e, block, blockData, 'both');
  });
  block.appendChild(resizer);
  
  makeDraggable(block, blockData);
  
  document.body.appendChild(block);
  return block;
}

// 轉換顏色格式為 RGBA
function convertToRGBA(color, alpha) {
  if (color.startsWith('rgba')) {
    return color;
  }
  
  let r, g, b;
  
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const matches = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (matches) {
      r = parseInt(matches[1]);
      g = parseInt(matches[2]);
      b = parseInt(matches[3]);
    }
  }
  
  if (r !== undefined && g !== undefined && b !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  return `rgba(255, 107, 107, ${alpha})`;
}

// 初始化大小調整
function initResize(e, element, data, type) {
  e.preventDefault();
  e.stopPropagation();
  
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = parseInt(getComputedStyle(element).width, 10);
  const startHeight = parseInt(getComputedStyle(element).height, 10);
  
  function doDrag(e) {
    if (type === 'width' || type === 'both') {
      const newWidth = startWidth + e.clientX - startX;
      if (newWidth > 50) {
        element.style.width = newWidth + 'px';
        if (data.size) {
          data.size.width = newWidth;
        } else if (typeof data.width !== 'undefined') {
          data.width = newWidth + 'px';
        }
      }
    }
    
    if (type === 'height' || type === 'both') {
      const newHeight = startHeight + e.clientY - startY;
      if (newHeight > 30) {
        element.style.height = newHeight + 'px';
        if (data.size) {
          data.size.height = newHeight;
        }
      }
    }
  }
  
  function stopDrag() {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    saveElements();
  }
  
  document.addEventListener('mousemove', doDrag, false);
  document.addEventListener('mouseup', stopDrag, false);
}

// 創建便利貼
function createNote(noteData) {
  const note = document.createElement('div');
  note.className = 'focuscut-sticky-note';
  note.style.position = 'absolute';
  note.style.left = noteData.position.x + 'px';
  note.style.top = noteData.position.y + 'px';
  note.style.width = (noteData.width || '250px');
  note.style.height = (noteData.height || 'auto');
  note.style.backgroundColor = noteData.color || '#f8f0cc';
  note.style.zIndex = '10000';
  
  // 添加刪除按鈕
  const deleteButton = document.createElement('div');
  deleteButton.className = 'focuscut-delete-button';
  deleteButton.innerHTML = '×';
  deleteButton.addEventListener('click', (e) => {
    e.stopPropagation();
    note.remove();
    elements.notes = elements.notes.filter(n => n !== noteData);
    saveElements();
  });
  note.appendChild(deleteButton);
  
  // 添加調整大小控制點
  const resizer = document.createElement('div');
  resizer.className = 'focuscut-resizer focuscut-resizer-both';
  resizer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    initResize(e, note, noteData, 'both');
  });
  note.appendChild(resizer);
  
  // 添加文本區域
  const textarea = document.createElement('textarea');
  textarea.value = noteData.text || '';
  textarea.style.width = '100%';
  textarea.style.height = '100%';
  textarea.style.minHeight = '80px';
  textarea.style.border = 'none';
  textarea.style.resize = 'none';
  textarea.style.background = 'transparent';
  textarea.style.fontFamily = 'inherit';
  textarea.style.fontSize = '14px';
  textarea.style.padding = '8px';
  textarea.style.outline = 'none';
  textarea.style.lineHeight = '1.6';
  textarea.style.boxShadow = 'inset 0 0 3px rgba(0,0,0,0.1)';
  textarea.style.borderRadius = '2px';
  textarea.addEventListener('focus', () => {
    textarea.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
  });
  textarea.addEventListener('blur', () => {
    textarea.style.backgroundColor = 'transparent';
  });
  
  textarea.addEventListener('input', (e) => {
    noteData.text = e.target.value;
    saveElements();
  });
  note.appendChild(textarea);
  
  makeDraggable(note, noteData);
  
  document.body.appendChild(note);
  return note;
}

// 使元素可拖動
function makeDraggable(element, data) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;
  
  element.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    // 排除點擊控制元素的情況
    if (e.target.classList.contains('focuscut-delete-button') || 
        e.target.classList.contains('focuscut-resizer') ||
        e.target.classList.contains('note-delete') ||
        e.target.classList.contains('note-color-picker') ||
        e.target.tagName.toLowerCase() === 'textarea') {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // 記錄起始位置
    startX = e.clientX;
    startY = e.clientY;
    
    // 獲取元素當前位置
    const style = window.getComputedStyle(element);
    initialLeft = parseInt(style.left);
    initialTop = parseInt(style.top);
    
    isDragging = true;
    
    // 增加拖曳時的樣式
    element.style.opacity = '0.8';
    
    document.addEventListener('mousemove', elementDrag);
    document.addEventListener('mouseup', closeDragElement);
  }
  
  function elementDrag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 計算移動的距離
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // 更新元素位置
    const newLeft = initialLeft + dx;
    const newTop = initialTop + dy;
    
    element.style.left = newLeft + 'px';
    element.style.top = newTop + 'px';
    
    // 更新數據，但先不保存，避免頻繁存儲
    data.position.x = newLeft;
    data.position.y = newTop;
  }
  
  function closeDragElement(e) {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 恢復原始透明度
    element.style.opacity = '1';
    
    // 移除事件監聽器
    document.removeEventListener('mousemove', elementDrag);
    document.removeEventListener('mouseup', closeDragElement);
    
    // 完成拖曳時保存一次
    saveElements();
  }
}

// 添加分隔線
function addDivider(color = '#ff6b6b') {
  console.log('FocusCut: Adding divider with color', color);
  const dividerData = {
    color: color,
    position: { x: 20, y: window.scrollY + 100 },
    width: '40%'
  };
  elements.dividers.push(dividerData);
  createDivider(dividerData);
  saveElements();
}

// 添加色卡
function addBlock(color = '#ff6b6b') {
  console.log('FocusCut: Adding reading card with color', color);
  const blockData = {
    color: color,
    position: { x: 50, y: window.scrollY + 150 },
    size: { width: 600, height: 200 }
  };
  elements.blocks.push(blockData);
  createBlock(blockData);
  saveElements();
}

// 添加便利貼
function addNote(color = '#f8f0cc') {
  console.log('FocusCut: Adding note with color', color);
  const noteData = {
    text: '',
    color: color,
    position: { x: 20, y: window.scrollY + 50 },
    width: '250px',
    height: '150px'
  };
  elements.notes.push(noteData);
  createNote(noteData);
  saveElements();
}

// 初始化
console.log('FocusCut: Script loaded on URL:', window.location.href);

// 載入已保存的元素
console.log('FocusCut Content: Loading saved elements');
loadSavedElements(); 