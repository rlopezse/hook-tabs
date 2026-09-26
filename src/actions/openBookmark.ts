export const openBookmark = (
  bookmark: chrome.bookmarks.BookmarkTreeNode,
  sourceWindowId: number,
) => {
  if (!bookmark.url) return

  chrome.tabs.create({
    url: bookmark.url,
    windowId: sourceWindowId,
  })

  window.close()
}
