document.addEventListener('DOMContentLoaded', function() {
  const tabsList = document.getElementById('tabsList');
  const searchInput = document.getElementById('searchInput');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const copyTabsBtn = document.getElementById('copyTabs');
  const pasteTabsBtn = document.getElementById('pasteTabs');
  const clipboardArea = document.getElementById('clipboardArea');
  const statusMessage = document.getElementById('statusMessage');

  let allTabs = [];

  // Load all tabs
  function loadTabs() {
    chrome.tabs.query({}, function(tabs) {
      // Filter out tabs that don't start with http or https
      allTabs = tabs.filter(tab => tab.url.startsWith('http'));
      displayTabs(allTabs);
    });
  }

  // Display tabs in the list
  function displayTabs(tabs) {
    tabsList.innerHTML = '';
    
    if (tabs.length === 0) {
      tabsList.innerHTML = '<div class="tab-item">No tabs match your search</div>';
      return;
    }

    tabs.forEach(tab => {
      const tabElement = document.createElement('div');
      tabElement.className = 'tab-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'tab-checkbox';
      checkbox.dataset.tabId = tab.id;
      
      const favicon = document.createElement('img');
      favicon.className = 'favicon';
      favicon.src = tab.favIconUrl || 'icons/icon16.png';
      favicon.onerror = () => favicon.src = 'icons/icon16.png';
      
      const tabInfo = document.createElement('div');
      tabInfo.className = 'tab-info';
      
      const titleElement = document.createElement('div');
      titleElement.className = 'tab-title';
      titleElement.textContent = tab.title;
      
      const urlElement = document.createElement('div');
      urlElement.className = 'tab-url';
      urlElement.textContent = tab.url;
      
      tabInfo.appendChild(titleElement);
      tabInfo.appendChild(urlElement);
      
      tabElement.appendChild(checkbox);
      tabElement.appendChild(favicon);
      tabElement.appendChild(tabInfo);
      
      // Make entire row clickable to focus the tab
      tabInfo.addEventListener('click', () => {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      });
      
      tabsList.appendChild(tabElement);
    });
  }

  // Filter tabs based on search input
  function filterTabs() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredTabs = allTabs.filter(tab => 
      tab.title.toLowerCase().includes(searchTerm) || 
      tab.url.toLowerCase().includes(searchTerm)
    );
    displayTabs(filteredTabs);
  }

  // Get selected tab IDs
  function getSelectedTabs() {
    const checkboxes = document.querySelectorAll('.tab-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => parseInt(checkbox.dataset.tabId));
  }

  // Copy selected tab URLs to clipboard
  function copyTabsToClipboard() {
    const selectedTabIds = getSelectedTabs();
    
    if (selectedTabIds.length === 0) {
      showStatus('Please select at least one tab to copy', 'error');
      return;
    }
    
    // Get only the URLs from selected tabs (only http/https URLs)
    const urlsToExport = allTabs
      .filter(tab => selectedTabIds.includes(tab.id))
      .filter(tab => tab.url.startsWith('http'))
      .map(tab => tab.url);
    
    // Join URLs as a simple text format (one URL per line)
    const textToCopy = urlsToExport.join('\n');
    
    // Copy to clipboard using Clipboard API
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showStatus(`${urlsToExport.length} tab URLs copied to clipboard!`, 'success');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        
        // Fallback method
        clipboardArea.value = textToCopy;
        clipboardArea.style.position = 'fixed';
        clipboardArea.focus();
        clipboardArea.select();
        
        const successful = document.execCommand('copy');
        clipboardArea.style.position = 'absolute';
        clipboardArea.style.left = '-9999px';
        
        if (successful) {
          showStatus(`${urlsToExport.length} tab URLs copied to clipboard!`, 'success');
        } else {
          showStatus('Failed to copy URLs to clipboard', 'error');
        }
      });
  }

  // Paste and open tabs from clipboard
  async function pasteTabsFromClipboard() {
    try {
      // Try to read from clipboard
      const clipboardText = await navigator.clipboard.readText()
        .catch(() => {
          // If Clipboard API fails, show error
          throw new Error('Unable to access clipboard. Please check browser permissions.');
        });
      
      if (!clipboardText || clipboardText.trim() === '') {
        throw new Error('Clipboard is empty');
      }
      
      // Parse URLs from clipboard text
      const urls = clipboardText.split('\n')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('http'));
      
      if (urls.length === 0) {
        throw new Error('No valid URLs found in clipboard');
      }
      
      // Open each URL in a new tab
      urls.forEach(url => {
        chrome.tabs.create({ url: url, active: false });
      });
      
      showStatus(`${urls.length} tabs imported successfully!`, 'success');
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
    }
  }

  // Show status message
  function showStatus(message, type = '') {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = 'status-message';
    }, 5000);
  }

  // Event listeners
  searchInput.addEventListener('input', filterTabs);
  
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.tab-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = true);
  });
  
  deselectAllBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.tab-checkbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
  });
  
  copyTabsBtn.addEventListener('click', copyTabsToClipboard);
  
  pasteTabsBtn.addEventListener('click', pasteTabsFromClipboard);

  // Initialize
  loadTabs();
});
