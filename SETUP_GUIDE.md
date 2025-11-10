# MultiFind Chrome Extension - Complete Setup Guide

## Remaining Files to Create

This guide contains all the code for the remaining files needed to complete the MultiFind extension.

---

## 1. src/popup/popup.js

Create this file at `src/popup/popup.js`:

```javascript
let keywords = [];
const colors = ['#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181', '#aa96da'];

const keywordInput = document.getElementById('keywordInput');
const addKeywordBtn = document.getElementById('addKeyword');
const keywordsList = document.getElementById('keywordsList');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const totalMatchesEl = document.getElementById('totalMatches');

// Load saved keywords
chrome.storage.local.get(['keywords'], (result) => {
  if (result.keywords) {
    keywords = result.keywords;
    renderKeywords();
  }
});

// Add keyword on button click
addKeywordBtn.addEventListener('click', addKeyword);

// Add keyword on Enter key
keywordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addKeyword();
  }
});

// Search and highlight
searchBtn.addEventListener('click', searchAndHighlight);

// Clear all
clearBtn.addEventListener('click', clearAll);

function addKeyword() {
  const keyword = keywordInput.value.trim();
  if (keyword && !keywords.includes(keyword)) {
    keywords.push(keyword);
    keywordInput.value = '';
    renderKeywords();
    saveKeywords();
  }
}

function renderKeywords() {
  keywordsList.innerHTML = '';
  keywords.forEach((keyword, index) => {
    const item = document.createElement('div');
    item.className = 'keyword-item';
    item.innerHTML = `
      <span class="keyword-text">${keyword}</span>
      <span class="keyword-count" id="count-${index}">0 matches</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    keywordsList.appendChild(item);
  });

  // Add remove listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      keywords.splice(index, 1);
      renderKeywords();
      saveKeywords();
    });
  });
}

function saveKeywords() {
  chrome.storage.local.set({ keywords });
}

function searchAndHighlight() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'highlight', keywords, colors },
      (response) => {
        if (response && response.matches) {
          updateMatchCounts(response.matches);
        }
      }
    );
  });
}

function updateMatchCounts(matches) {
  let totalMatches = 0;
  keywords.forEach((keyword, index) => {
    const count = matches[keyword] || 0;
    totalMatches += count;
    const countEl = document.getElementById(`count-${index}`);
    if (countEl) {
      countEl.textContent = `${count} matches`;
    }
  });
  totalMatchesEl.textContent = `${totalMatches} total matches found`;
}

function clearAll() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'clear' });
  });
  keywords = [];
  renderKeywords();
  saveKeywords();
  totalMatchesEl.textContent = '0 matches found';
}
```

---

## 2. src/content/content.js

Create this file at `src/content/content.js`:

```javascript
let currentHighlights = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'highlight') {
    clearHighlights();
    const matches = highlightKeywords(request.keywords, request.colors);
    sendResponse({ matches });
  } else if (request.action === 'clear') {
    clearHighlights();
    sendResponse({ success: true });
  }
  return true;
});

function highlightKeywords(keywords, colors) {
  const matches = {};
  const body = document.body;
  
  keywords.forEach((keyword, index) => {
    matches[keyword] = 0;
    const color = colors[index % colors.length];
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    
    highlightTextNodes(body, regex, color, (match) => {
      matches[keyword]++;
    });
  });
  
  return matches;
}

function highlightTextNodes(node, regex, color, callback) {
  if (node.nodeType === 3) { // Text node
    const text = node.textContent;
    if (regex.test(text)) {
      const span = document.createElement('span');
      const parent = node.parentNode;
      
      span.innerHTML = text.replace(regex, (match) => {
        callback(match);
        return `<mark class="multifind-highlight" style="background-color: ${color}; color: #000; padding: 2px 0; border-radius: 2px;">${match}</mark>`;
      });
      
      parent.replaceChild(span, node);
      currentHighlights.push(span);
    }
  } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
    Array.from(node.childNodes).forEach(child => {
      highlightTextNodes(child, regex, color, callback);
    });
  }
}

function clearHighlights() {
  currentHighlights.forEach(span => {
    const parent = span.parentNode;
    if (parent) {
      const textNode = document.createTextNode(span.textContent);
      parent.replaceChild(textNode, span);
    }
  });
  currentHighlights = [];
  
  // Also remove any remaining mark elements
  document.querySelectorAll('mark.multifind-highlight').forEach(mark => {
    const text = mark.textContent;
    mark.replaceWith(text);
  });
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

## 3. src/content/content.css

Create this file at `src/content/content.css`:

```css
mark.multifind-highlight {
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 500;
  transition: all 0.2s ease;
}

mark.multifind-highlight:hover {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}
```

---

## 4. Updated manifest.json

Update your `manifest.json` to match the new structure:

```json
{
  "manifest_version": 3,
  "name": "MultiFind - Multi-Keyword Search",
  "version": "1.0.0",
  "description": "Search and highlight multiple keywords/phrases simultaneously on any webpage. Perfect for researchers, developers, and analysts.",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "src/assets/icons/icon16.png",
      "48": "src/assets/icons/icon48.png",
      "128": "src/assets/icons/icon128.png"
    }
  },
  "icons": {
    "16": "src/assets/icons/icon16.png",
    "48": "src/assets/icons/icon48.png",
    "128": "src/assets/icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"],
      "css": ["src/content/content.css"]
    }
  ]
}
```

---

## 5. Project Structure

```
multifind-chrome-extension/
├── manifest.json
├── README.md
├── SETUP_GUIDE.md
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── content/
│   │   ├── content.js
│   │   └── content.css
│   └── assets/
│       └── icons/
│           ├── icon16.png
│           ├── icon48.png
│           └── icon128.png
```

---

## 6. Installation Instructions

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `multifind-chrome-extension` folder
6. The extension is now installed!

---

## 7. How to Use

1. Click the MultiFind extension icon in your browser
2. Enter keywords/phrases you want to search for
3. Click "Add" for each keyword
4. Click "Search & Highlight" to highlight all keywords on the page
5. Each keyword gets a unique color
6. Use "Clear All" to remove highlights

---

## 8. Creating Icons

For now, you can use placeholder icons or create simple colored squares:
- 16x16 px for toolbar
- 48x48 px for extension management
- 128x128 px for Chrome Web Store

Recommended: Use a tool like Canva or Figma to create icons with "MF" text or a search symbol.

---

## Features

✅ Search multiple keywords simultaneously
✅ Color-coded highlighting (5 distinct colors)
✅ Real-time match counting
✅ Case-insensitive search
✅ Works on any webpage
✅ Persistent keyword storage
✅ Clean, modern UI
✅ Fully client-side

---

## Tech Stack

- Manifest V3 (Latest Chrome Extension standard)
- Vanilla JavaScript (No dependencies)
- Modern CSS (Flexbox, CSS Variables)
- Chrome Storage API
- Content Scripts for page manipulation

---

That's it! Your MultiFind extension is now complete and ready to use!
