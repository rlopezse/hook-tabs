import type { Dispatch, SetStateAction } from 'react'

export const closeTab = (
  tab: chrome.tabs.Tab,
  setTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>,
  setFilteredTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>,
  setSelectedIndex: Dispatch<SetStateAction<number>>,
  setIsMoveMode: Dispatch<SetStateAction<boolean>>,
) => {
  if (!tab.id) return

  chrome.tabs.remove(tab.id)

  setTabs((prevTabs) => prevTabs.filter((t) => t.id !== tab.id))

  setFilteredTabs((prevTabs) => prevTabs.filter((t) => t.id !== tab.id))

  setSelectedIndex((current) => Math.max(current - 1, 0))
  setIsMoveMode(false)
}
