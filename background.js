// WYSIWYG Page Editor - Background Service Worker
// Handles extension lifecycle and storage

chrome.runtime.onInstalled.addListener(() => {
  // Initialize default settings
  chrome.storage.local.set({
    editMode: false,
    editedElements: []
  });
  
  console.log('WYSIWYG Page Editor installed');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.local.get(['editMode'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (message.action === 'saveSettings') {
    chrome.storage.local.set(message.settings);
    sendResponse({ success: true });
    return true;
  }
});

// Listen for tab updates to manage edit mode state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Reset edit mode for new pages
    chrome.storage.local.set({ editMode: false });
  }
});