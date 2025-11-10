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
