import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'
import { restoreTab } from '../actions/restoreTab'
import { openTab } from '../actions/openTab'
import { openBookmark } from '../actions/openBookmark'
import { closeTab } from '../actions/closeTab'
import { togglePinTab } from '../actions/togglePinTab'
import { moveTab } from '../actions/moveTab'

interface HandleKeyDownDeps {
  filteredTabs: chrome.tabs.Tab[]
  filteredBookmarks: chrome.bookmarks.BookmarkTreeNode[]
  closedTabs: chrome.sessions.Session[]
  isShowingClosedTabs: boolean
  isTabSelected: boolean
  isMoveMode: boolean
  selectedIndex: number
  sourceWindowId: number
  setSelectedIndex: Dispatch<SetStateAction<number>>
  setIsMoveMode: Dispatch<SetStateAction<boolean>>
  setTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>
  setFilteredTabs: Dispatch<SetStateAction<chrome.tabs.Tab[]>>
}

export const handleKeyDown = (
  e: KeyboardEvent<HTMLInputElement>,
  deps: HandleKeyDownDeps,
) => {
  const {
    filteredTabs,
    filteredBookmarks,
    closedTabs,
    isShowingClosedTabs,
    isTabSelected,
    isMoveMode,
    selectedIndex,
    sourceWindowId,
    setSelectedIndex,
    setIsMoveMode,
    setTabs,
    setFilteredTabs,
  } = deps

  const combinedLength = filteredTabs.length + filteredBookmarks.length

  const activeLength = isShowingClosedTabs ? closedTabs.length : combinedLength

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()

      if (isMoveMode && isTabSelected) {
        moveTab(
          'down',
          selectedIndex,
          filteredTabs,
          setTabs,
          setFilteredTabs,
          setSelectedIndex,
        )
      } else if (activeLength > 0) {
        setSelectedIndex((current) => (current + 1) % activeLength)
      }

      break

    case 'ArrowUp':
      e.preventDefault()

      if (isMoveMode && isTabSelected) {
        moveTab(
          'up',
          selectedIndex,
          filteredTabs,
          setTabs,
          setFilteredTabs,
          setSelectedIndex,
        )
      } else if (activeLength > 0) {
        setSelectedIndex(
          (current) => (current - 1 + activeLength) % activeLength,
        )
      }

      break

    case 'm':
    case 'M':
      if (e.ctrlKey && isTabSelected) {
        e.preventDefault()

        if (filteredTabs[selectedIndex]) {
          setIsMoveMode((current) => !current)
        }
      }

      break

    case 'Enter':
      e.preventDefault()

      if (isShowingClosedTabs) {
        if (closedTabs[selectedIndex]) {
          restoreTab(closedTabs[selectedIndex])
        }
      } else if (isTabSelected) {
        if (filteredTabs[selectedIndex]) {
          openTab(filteredTabs[selectedIndex])
        }
      } else {
        const bookmark = filteredBookmarks[selectedIndex - filteredTabs.length]

        if (bookmark) {
          openBookmark(bookmark, sourceWindowId)
        }
      }

      break

    case 'ArrowLeft':
    case '<':
      e.preventDefault()

      if (isTabSelected && filteredTabs[selectedIndex]) {
        closeTab(
          filteredTabs[selectedIndex],
          setTabs,
          setFilteredTabs,
          setSelectedIndex,
          setIsMoveMode,
        )
      }

      break

    case 'w':
    case 'W':
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()

        if (isTabSelected && filteredTabs[selectedIndex]) {
          closeTab(
            filteredTabs[selectedIndex],
            setTabs,
            setFilteredTabs,
            setSelectedIndex,
            setIsMoveMode,
          )
        }
      }

      break

    case 'ArrowRight':
    case '>':
      e.preventDefault()

      if (isTabSelected && filteredTabs[selectedIndex]) {
        togglePinTab(
          filteredTabs[selectedIndex],
          setTabs,
          setFilteredTabs,
          setSelectedIndex,
        )
      }

      break

    case 'Escape':
      if (isMoveMode) {
        e.preventDefault()
        setIsMoveMode(false)
      } else {
        window.close()
      }

      break
  }
}
