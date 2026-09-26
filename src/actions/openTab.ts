export const openTab = (tab: chrome.tabs.Tab) => {
  if (!tab.id || !tab.windowId) return

  chrome.tabs.update(tab.id, {
    active: true,
  })

  chrome.windows.update(tab.windowId, {
    focused: true,
  })

  window.close()
}
