import type { Dispatch, SetStateAction } from 'react'
import { reorderByPinned } from '../utils/reorderByPinned'

export const togglePinTab = (
  tab: chrome.tabs.Tab,
  setTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>,
  setFilteredTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>,
  setSelectedIndex: Dispatch<SetStateAction<number>>,
) => {
  if (!tab.id) return

  const pinned = !tab.pinned

  chrome.tabs.update(tab.id, {
    pinned,
  })

  const applyPin = (prevTabs: chrome.tabs.Tab[]) =>
    reorderByPinned(
      prevTabs.map((t) => (t.id === tab.id ? { ...t, pinned } : t)),
    )

  setTabs(applyPin)

  setFilteredTabs((prevTabs) => {
    const updated = applyPin(prevTabs)

    setSelectedIndex(updated.findIndex((t) => t.id === tab.id))

    return updated
  })
}
