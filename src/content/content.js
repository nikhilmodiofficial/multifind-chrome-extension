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
  if (node.nodeType === 3) {
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
  
  document.querySelectorAll('mark.multifind-highlight').forEach(mark => {
    const text = mark.textContent;
    mark.replaceWith(text);
  });
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
