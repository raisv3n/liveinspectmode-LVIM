document.addEventListener('DOMContentLoaded', () => {
  const editModeToggle = document.getElementById('editModeToggle');
  const resetBtn = document.getElementById('resetBtn');

  loadEditModeState();

  editModeToggle.addEventListener('change', async () => {
    const isEnabled = editModeToggle.checked;
    await updateEditMode(isEnabled);
  });

  resetBtn.addEventListener('click', async () => {
    await sendMessageToContent({ action: 'resetChanges' });
  });

  async function loadEditModeState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getState' });
        if (response) {
          editModeToggle.checked = response.editMode || false;
        }
      }
    } catch (error) {
      console.log('Could not load edit mode state:', error);
    }
  }

  async function updateEditMode(enabled) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleEditMode', 
          enabled 
        });
      }
      await chrome.storage.local.set({ editMode: enabled });
    } catch (error) {
      console.log('Could not update edit mode:', error);
    }
  }

  async function sendMessageToContent(message) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, message);
        if (response?.message) {
          showNotification(response.message);
        }
      }
    } catch (error) {
      console.log('Error sending message:', error);
      showNotification('Error: Could not communicate with page');
    }
  }

  function showNotification(message) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }
});