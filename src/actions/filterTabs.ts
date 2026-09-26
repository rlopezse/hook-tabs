import type { Dispatch, SetStateAction } from 'react'

interface FilterTabsParams {
  search: string
  tabs: chrome.tabs.Tab[]
  bookmarks: chrome.bookmarks.BookmarkTreeNode[]
  setFilteredTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>
  setFilteredBookmarks: Dispatch<
    SetStateAction<chrome.bookmarks.BookmarkTreeNode[]>
  >
  setSelectedIndex: Dispatch<SetStateAction<number>>
  setIsMoveMode: Dispatch<SetStateAction<boolean>>
  setClosedTabs: Dispatch<SetStateAction<chrome.sessions.Session[]>>
}

export const filterTabs = ({
  search,
  tabs,
  bookmarks,
  setFilteredTabs,
  setFilteredBookmarks,
  setSelectedIndex,
  setIsMoveMode,
  setClosedTabs,
}: FilterTabsParams) => {
  const searchLower = search.toLowerCase()

  const matchingTabs = tabs.filter((tab) => {
    if (tab.url?.startsWith(chrome.runtime.getURL(''))) {
      return false
    }

    return (
      tab.title?.toLowerCase().includes(searchLower) ||
      tab.url?.toLowerCase().includes(searchLower)
    )
  })

  const openTabUrls = new Set(tabs.map((tab) => tab.url))

  const matchingBookmarks = searchLower
    ? bookmarks.filter(
        (bookmark) =>
          !openTabUrls.has(bookmark.url) &&
          (bookmark.title?.toLowerCase().includes(searchLower) ||
            bookmark.url?.toLowerCase().includes(searchLower)),
      )
    : []

  setFilteredTabs(matchingTabs)
  setFilteredBookmarks(matchingBookmarks)
  setSelectedIndex(0)
  setIsMoveMode(false)

  if (
    matchingTabs.length === 0 &&
    matchingBookmarks.length === 0 &&
    searchLower
  ) {
    chrome.sessions.getRecentlyClosed({ maxResults: 25 }, (sessions) => {
      const matchingClosedTabs = sessions.filter(
        (session) =>
          session.tab &&
          (session.tab.title?.toLowerCase().includes(searchLower) ||
            session.tab.url?.toLowerCase().includes(searchLower)),
      )

      setClosedTabs(matchingClosedTabs)
    })
  } else {
    setClosedTabs([])
  }
}
