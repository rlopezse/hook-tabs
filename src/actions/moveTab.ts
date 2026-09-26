import type { Dispatch, SetStateAction } from 'react'

export const moveTab = (
  direction: 'up' | 'down',
  selectedIndex: number,
  filteredTabs: chrome.tabs.Tab[],
  setTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>,
  setFilteredTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>,
  setSelectedIndex: Dispatch<SetStateAction<number>>,
) => {
  const currentIndex = selectedIndex

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (targetIndex < 0 || targetIndex >= filteredTabs.length) {
    return
  }

  const currentTab = filteredTabs[currentIndex]
  const targetTab = filteredTabs[targetIndex]

  if (!currentTab.id || !targetTab.id) return

  if (currentTab.windowId !== targetTab.windowId) return

  let newPinned = currentTab.pinned

  if (direction === 'up' && !currentTab.pinned && targetTab.pinned) {
    newPinned = true
  } else if (direction === 'down' && currentTab.pinned && !targetTab.pinned) {
    newPinned = false
  }

  if (newPinned !== currentTab.pinned) {
    chrome.tabs.update(currentTab.id, {
      pinned: newPinned,
    })
  }

  chrome.tabs.move(currentTab.id, {
    index: targetTab.index,
  })

  const applyMove = (prevTabs: chrome.tabs.Tab[]) => {
    const curPos = prevTabs.findIndex((t) => t.id === currentTab.id)

    const tgtPos = prevTabs.findIndex((t) => t.id === targetTab.id)

    if (curPos === -1 || tgtPos === -1) {
      return prevTabs
    }

    const updated = [...prevTabs]

    updated[curPos] = {
      ...prevTabs[tgtPos],
      index: prevTabs[curPos].index,
    }

    updated[tgtPos] = {
      ...prevTabs[curPos],
      pinned: newPinned,
      index: prevTabs[tgtPos].index,
    }

    return updated
  }

  setTabs(applyMove)

  setFilteredTabs((prevTabs) => {
    const updated = applyMove(prevTabs)

    setSelectedIndex(updated.findIndex((t) => t.id === currentTab.id))

    return updated
  })
}
