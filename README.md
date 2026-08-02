# FocusCut – Reading Overlay

<div align="center">
  <img src="banner/FocusCut.png" alt="FocusCut – Reading Overlay" width="600">
</div>

FocusCut 是一款 Chrome 閱讀輔助擴充功能，可在網頁上加入閱讀色卡、遮色片、便利貼與螢光筆，幫助使用者降低視覺干擾、整理資訊並維持閱讀焦點。

> [!IMPORTANT]
> FocusCut 目前仍在測試階段，尚未上架 Chrome 線上應用程式商店。請依照下方步驟，以「載入未封裝項目」方式安裝。

## 功能特色

- **閱讀色卡**：以半透明色卡標示或聚焦特定內容區域。
- **遮色片**：遮住畫面上下區域，保留中間閱讀範圍。
- **便利貼**：在網頁上加入可編輯、可移動的文字筆記。
- **螢光筆盒**：標記網頁文字，並可使用橡皮擦移除標記。
- **自由調整**：閱讀色卡與便利貼支援拖曳、縮放及鎖定位置。
- **自動儲存**：每個頁面的 FocusCut 內容會儲存在 Chrome 本機，重新整理後仍可還原。
- **清除本頁**：透過彈窗底部的垃圾桶按鈕，確認後清除目前頁面的 FocusCut 內容。
- **多語系介面**：支援繁體中文、簡體中文與英文。

## 安裝方法（開發測試版）

### 手動安裝

1. 下載此專案並解壓縮。
2. 在 Chrome 開啟 `chrome://extensions/`。
3. 開啟右上角的「開發人員模式」。
4. 點擊「載入未封裝項目」。
5. 選擇本專案資料夾。

## 使用方法

1. 點擊瀏覽器工具列中的 **FocusCut** 圖示。
2. 在「閱讀色卡」或「便利貼」選擇顏色，再點擊「新增」。
3. 使用右側開關啟用遮色片或螢光筆盒。
4. 拖曳卡片調整位置；使用角落控制點調整大小，或使用鎖定按鈕固定在畫面上。
5. 點擊元素右上角的刪除按鈕可移除單一元素。
6. 點擊彈窗底部的垃圾桶可清除目前頁面的所有 FocusCut 內容；點擊 `?` 可查看使用說明。

## 資料與隱私

- 不需要帳號或登入。
- 不收集個人資訊，也不追蹤瀏覽活動。
- 閱讀色卡、遮色片、便利貼與標記只會儲存在 Chrome 的本機擴充功能儲存空間。
- 不會將網頁內容或使用者資料傳送至外部伺服器。

詳細內容請參閱 [Privacy Policy](privacy.html)。

## 開發與測試

```bash
node --test tests/*.test.js
```

## 專案資訊

- 顯示名稱：FocusCut – Reading Overlay
- 目前版本：v1.3（開發測試版）
- 開發者：Kaifen Chang
- 授權：MIT License

如有問題或建議，歡迎透過 GitHub Issues 回報。

---

# FocusCut – Reading Overlay (English)

FocusCut is a Chrome reading-assistance extension that adds reading cards, a reading mask, sticky notes, and highlighting tools to web pages. It helps reduce visual distractions, organize information, and maintain reading focus.

> [!IMPORTANT]
> FocusCut is currently in development and is not yet available on the Chrome Web Store. Follow the instructions below to install it as an unpacked extension.

## Features

- **Reading Cards**: Place translucent cards over selected areas of a page.
- **Reading Mask**: Cover the upper and lower parts of the page while keeping the reading area visible.
- **Sticky Notes**: Add editable and movable notes to web pages.
- **Highlighter Toolbox**: Highlight page text and remove marks with the eraser.
- **Flexible Layout**: Move, resize, and lock reading cards and sticky notes.
- **Automatic Saving**: FocusCut content is stored locally for each page and restored after refresh.
- **Clear This Page**: Remove all FocusCut content from the current page after confirmation.
- **Multilingual UI**: Supports Traditional Chinese, Simplified Chinese, and English.

## Installation (Development Version)

1. Download and extract this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project directory.

## How to Use

1. Click the **FocusCut** icon in the browser toolbar.
2. Choose a color under Reading Card or Sticky Note, then click **Add**.
3. Use the switches to enable the Reading Mask or Highlighter Toolbox.
4. Drag items to move them; use the corner handle to resize or the lock button to pin them to the viewport.
5. Use an item's delete control to remove it individually.
6. Use the trash icon in the popup to clear all FocusCut content from the current page, or select `?` for instructions.

## Data and Privacy

- No account or login is required.
- FocusCut does not collect personal information or track browsing activity.
- Reading cards, masks, notes, and highlights are stored only in Chrome's local extension storage.
- Page content and user data are never sent to external servers.

See the full [Privacy Policy](privacy.html).

## Development and Testing

```bash
node --test tests/*.test.js
```

## Project Information

- Display name: FocusCut – Reading Overlay
- Current version: v1.3 (development build)
- Developer: Kaifen Chang
- License: MIT License

Please use GitHub Issues for bug reports and suggestions.

---

© 2025 Kaifen Chang. All Rights Reserved.
