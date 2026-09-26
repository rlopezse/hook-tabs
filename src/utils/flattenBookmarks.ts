export const flattenBookmarks = (
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode[] =>
  nodes.flatMap((node) => [
    ...(node.url ? [node] : []),
    ...(node.children ? flattenBookmarks(node.children) : []),
  ])
