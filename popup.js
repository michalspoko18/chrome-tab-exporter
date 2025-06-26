document.addEventListener('DOMContentLoaded', function() {
  const tabsList = document.getElementById('tabsList');
  const searchInput = document.getElementById('searchInput');
  const selectAllBtn = document.getElementById('selectAll');
  const deselectAllBtn = document.getElementById('deselectAll');
  const exportTabsBtn = document.getElementById('exportTabs');
  const importTabsBtn = document.getElementById('importTabs');
  const importFile = document.getElementById('importFile');
  const statusMessage = document.getElementById('statusMessage');

  let allTabs = [];

  // Load all tabs
  function loadTabs() {
    chrome.tabs.query({}, function(tabs) {
      allTabs = tabs;
      displayTabs(tabs);
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

  // Export tabs as encoded text (URLs only)
  function exportTabs() {
    const selectedTabIds = getSelectedTabs();
    
    if (selectedTabIds.length === 0) {
      showStatus('Please select at least one tab to export', 'error');
      return;
    }
    
    // Get only the URLs from selected tabs
    const urlsToExport = allTabs
      .filter(tab => selectedTabIds.includes(tab.id))
      .map(tab => tab.url);
    
    // Encode URLs as a simple text format (one URL per line)
    const encodedUrls = urlsToExport.join('\n');
    
    // Create a blob with the encoded text
    const blob = new Blob([encodedUrls], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    const fileName = `chrome-tabs-${dateString}.txt`;
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;
    downloadLink.click();
    
    URL.revokeObjectURL(url);
    showStatus(`${urlsToExport.length} tabs exported successfully!`, 'success');
  }

  // Import tabs from a text file
  function importTabsFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        // Split the content by newlines to get individual URLs
        const fileContent = event.target.result;
        let urls = [];
        
        // Try to parse as JSON first (for backward compatibility)
        try {
          const jsonData = JSON.parse(fileContent);
          if (jsonData.tabs && Array.isArray(jsonData.tabs)) {
            urls = jsonData.tabs.map(tab => tab.url).filter(url => url);
          }
        } catch {
          // Not JSON, treat as plain text with one URL per line
          urls = fileContent.split('\n')
            .map(url => url.trim())
            .filter(url => url && url.startsWith('http'));
        }
        
        if (urls.length === 0) {
          throw new Error('No valid URLs found in the file');
        }
        
        // Open each URL in a new tab
        urls.forEach(url => {
          chrome.tabs.create({ url: url, active: false });
        });
        
        showStatus(`${urls.length} tabs imported successfully!`, 'success');
      } catch (error) {
        showStatus(`Error importing tabs: ${error.message}`, 'error');
      }
    };
    
    reader.onerror = function() {
      showStatus('Error reading file', 'error');
    };
    
    reader.readAsText(file);
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
  
  exportTabsBtn.addEventListener('click', exportTabs);
  
  importTabsBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
      importTabsFromFile(event.target.files[0]);
      event.target.value = ''; // Reset file input
    }
  });

  // Initialize
  loadTabs();
});
