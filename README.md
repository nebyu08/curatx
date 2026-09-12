# CuratX - Custom Feed & Media Controller for X (Twitter)

**CuratX** is a lightweight, high-performance browser extension (Manifest V3) that gives you full control over what media appears on your X (Twitter) timeline.

Whether you want a distraction-free **Text-Only** reading experience, prefer **Text + Images** without video autoplay distractions, or want to block GIFs and link cards, CuratX lets you fine-tune your feed effortlessly.

---

## Features

- **Selective Media Filtering**:
  - **Videos**: Filter out video posts and clips.
  - **Images / Photos**: Filter out photos and media galleries.
  - **GIFs**: Distinctly detect and filter animated GIFs.
  - **Link Cards**: Filter out external link preview banners.
- **One-Click Presets**:
  - **Text Only**: Hides all posts containing videos, images, GIFs, and cards.
  - **Text + Images**: Hides videos and GIFs, leaving text and photos.
  - **No Videos**: Blocks videos while leaving other media visible.
  - **Custom**: Toggle individual media types according to your preference.
- **Flexible Hiding Modes**:
  - **Completely Invisible**: Seamlessly removes blocked posts and timeline dividers with zero empty space.
  - **Placeholder Bar**: Replaces blocked posts with a compact bar showing the reason (e.g. *Post hidden: Video*) and a one-click **"Show"** button.
- **Real-Time Updates**: Changes made in the popup take effect immediately on your active X tab without requiring a page refresh.
- **Live Session Stats**: Shows the number of blocked posts on your current tab in real time.
- **Zero Build Step**: Built with pure vanilla JavaScript, HTML, and CSS. No compilers or bundle steps required.

---

## Installation Guide

### Chrome, Brave, Edge, Opera (Chromium)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/nebyu08/curatx.git
   ```
2. Open your browser and navigate to the Extensions management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
3. Toggle on **"Developer mode"** (usually located in the top-right corner).
4. Click the **"Load unpacked"** button.
5. Select the `tune_x` folder where this repository is stored.
6. Navigate to [x.com](https://x.com) or [twitter.com](https://twitter.com) and click the CuratX puzzle icon in your browser toolbar to customize your feed!

---

## Project Structure

```
tune_x/
├── manifest.json            # Manifest V3 configuration & permissions
├── popup/
│   ├── popup.html           # Settings popup UI
│   ├── popup.css            # Dark-mode styling matching X aesthetic
│   └── popup.js             # State persistence and tab communication
├── content/
│   ├── content.js           # Media classifier & timeline MutationObserver
│   └── content.css          # Post-hiding & placeholder styles
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── test/
│   └── filter_test.js       # Unit tests for media detection & presets
└── package.json             # Dev dependencies (JSDOM for tests)
```

---

## Running Tests

To verify detection logic across simulated tweet types (text, photos, native videos, GIFs, and link preview cards):

```bash
npm test
```

---

## How It Works

1. **Virtual Timeline Observation**: X uses a virtualized scrolling list. The content script uses a debounced `MutationObserver` with `requestAnimationFrame` to scan feed items (`article[data-testid="tweet"]`) efficiently as you scroll.
2. **Accurate Media Detection**: Distinguishes between native videos, looping GIFs (checking for GIF badges/metadata), media photos (`div[data-testid="tweetPhoto"]`), and external link cards, while ignoring user profile avatars and emojis.
3. **Seamless Storage Sync**: Settings are saved via `chrome.storage.sync`. When toggles are switched in the popup, the content script's `chrome.storage.onChanged` listener re-evaluates visible posts immediately.
