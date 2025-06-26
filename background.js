// Background script for Chrome Tab Exporter
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chrome Tab Exporter extension installed');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sendResponse) => {
  if (message.action === 'getTabs') {
    chrome.tabs.query({}, (tabs) => {
      sendResponse({ tabs: tabs });
    });
    return true; // Required for async sendResponse
  }
});
