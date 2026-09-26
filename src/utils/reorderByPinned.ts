export const reorderByPinned = (tabs: chrome.tabs.Tab[]) =>
  [...tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned))
