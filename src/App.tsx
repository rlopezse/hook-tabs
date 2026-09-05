import { useEffect, useRef, useState } from 'react'
import s from './App.module.css'
import { t, type Lang } from './i18n'

const flattenBookmarks = (
  nodes: chrome.bookmarks.BookmarkTreeNode[],
): chrome.bookmarks.BookmarkTreeNode[] =>
  nodes.flatMap((node) => [
    ...(node.url ? [node] : []),
    ...(node.children ? flattenBookmarks(node.children) : []),
  ])

function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [filteredTabs, setFilteredTabs] = useState<chrome.tabs.Tab[]>([])
  const [closedTabs, setClosedTabs] = useState<chrome.sessions.Session[]>([])
  const [bookmarks, setBookmarks] = useState<
    chrome.bookmarks.BookmarkTreeNode[]
  >([])
  const [filteredBookmarks, setFilteredBookmarks] = useState<
    chrome.bookmarks.BookmarkTreeNode[]
  >([])

  const inputRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<HTMLLIElement>(null)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isMoveMode, setIsMoveMode] = useState(false)
  const [lang, setLang] = useState<Lang>('en')

  const windowIdParam = new URLSearchParams(window.location.search).get(
    'windowId',
  )
  const sourceWindowId = windowIdParam ? Number(windowIdParam) : NaN

  const bookmarkedUrls = new Set(bookmarks.map((bookmark) => bookmark.url))

  const isShowingClosedTabs =
    filteredTabs.length === 0 &&
    filteredBookmarks.length === 0 &&
    closedTabs.length > 0

  const isTabSelected =
    !isShowingClosedTabs && selectedIndex < filteredTabs.length

  useEffect(() => {
    if (!Number.isInteger(sourceWindowId)) return

    chrome.tabs.query({ windowId: sourceWindowId }, (queriedTabs) => {
      const validTabs = queriedTabs.filter(
        (tab) => !tab.url?.startsWith(chrome.runtime.getURL('')),
      )

      setTabs(validTabs)
      setFilteredTabs(validTabs)

      const activeIndex = validTabs.findIndex((tab) => tab.active)

      setSelectedIndex(activeIndex === -1 ? 0 : activeIndex)
    })

    chrome.bookmarks.getTree((nodes) => {
      setBookmarks(flattenBookmarks(nodes))
    })

    inputRef.current?.focus()
  }, [sourceWindowId])

  useEffect(() => {
    chrome.storage.local.get('lang', (result) => {
      if (result.lang === 'en' || result.lang === 'es') {
        setLang(result.lang)
      }
    })
  }, [])

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'es' : 'en'

    setLang(nextLang)
    chrome.storage.local.set({ lang: nextLang })
  }

  useEffect(() => {
    document.title = t(lang, 'appTitle')
    document.documentElement.lang = lang
  }, [lang])

  const isBookmarked = (url?: string) => !!url && bookmarkedUrls.has(url)

  const filterTabs = (search: string) => {
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

  const restoreTab = (session: chrome.sessions.Session) => {
    if (!session.tab?.sessionId) return

    chrome.sessions.restore(session.tab.sessionId)

    window.close()
  }

  const openBookmark = (bookmark: chrome.bookmarks.BookmarkTreeNode) => {
    if (!bookmark.url) return

    chrome.tabs.create({
      url: bookmark.url,
      windowId: sourceWindowId,
    })

    window.close()
  }

  useEffect(() => {
    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus()) {
          window.close()
        }
      }, 100)
    }

    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const combinedLength = filteredTabs.length + filteredBookmarks.length

    const activeLength = isShowingClosedTabs
      ? closedTabs.length
      : combinedLength

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()

        if (isMoveMode && isTabSelected) {
          moveTab('down')
        } else if (activeLength > 0) {
          setSelectedIndex((current) => (current + 1) % activeLength)
        }

        break

      case 'ArrowUp':
        e.preventDefault()

        if (isMoveMode && isTabSelected) {
          moveTab('up')
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
          const bookmark =
            filteredBookmarks[selectedIndex - filteredTabs.length]

          if (bookmark) {
            openBookmark(bookmark)
          }
        }

        break

      case 'ArrowLeft':
      case '<':
        e.preventDefault()

        if (isTabSelected && filteredTabs[selectedIndex]) {
          closeTab(filteredTabs[selectedIndex])
        }

        break

      case 'w':
      case 'W':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()

          if (isTabSelected && filteredTabs[selectedIndex]) {
            closeTab(filteredTabs[selectedIndex])
          }
        }

        break

      case 'ArrowRight':
      case '>':
        e.preventDefault()

        if (isTabSelected && filteredTabs[selectedIndex]) {
          togglePinTab(filteredTabs[selectedIndex])
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

  const openTab = (tab: chrome.tabs.Tab) => {
    if (!tab.id || !tab.windowId) return

    chrome.tabs.update(tab.id, {
      active: true,
    })

    chrome.windows.update(tab.windowId, {
      focused: true,
    })

    window.close()
  }

  const closeTab = (tab: chrome.tabs.Tab) => {
    if (!tab.id) return

    chrome.tabs.remove(tab.id)

    setTabs((prevTabs) => prevTabs.filter((t) => t.id !== tab.id))

    setFilteredTabs((prevTabs) => prevTabs.filter((t) => t.id !== tab.id))

    setSelectedIndex((current) => Math.max(current - 1, 0))
    setIsMoveMode(false)
  }

  const reorderByPinned = (tabs: chrome.tabs.Tab[]) =>
    [...tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  const moveTab = (direction: 'up' | 'down') => {
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

  const togglePinTab = (tab: chrome.tabs.Tab) => {
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

  const getDomain = (url?: string) => {
    if (!url) return ''

    try {
      return new URL(url).hostname
    } catch {
      return ''
    }
  }

  return (
    <>
      <div className={s.search}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlSpace="preserve"
          style={{
            width: '12',
            height: '12',
            fillRule: 'evenodd',
            clipRule: 'evenodd',
            position: 'absolute',
            top: 'calc(50% - 6px)',
            left: '16px',
            opacity: '0.5',
          }}
          viewBox="0 0 20 20"
        >
          <path
            d="M14.386 14.386l4.0877 4.0877-4.0877-4.0877c-2.9418 2.9419-7.7115 2.9419-10.6533 0-2.9419-2.9418-2.9419-7.7115 0-10.6533 2.9418-2.9419 7.7115-2.9419 10.6533 0 2.9419 2.9419 2.9419 7.7115 0 10.6533z"
            stroke="currentColor"
            fill="none"
            fillRule="evenodd"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <input
          ref={inputRef}
          placeholder={t(lang, 'searchPlaceholder')}
          onChange={(e) => filterTabs(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <span>esc</span>
      </div>

      <ul className={s.tab_list}>
        {filteredTabs.length === 0 &&
        filteredBookmarks.length === 0 &&
        closedTabs.length === 0 ? (
          <li className={s.tab_list_notfound}>
            <span>{t(lang, 'notFound')}</span>
          </li>
        ) : isShowingClosedTabs ? (
          closedTabs.map((session, index) => (
            <li
              key={session.tab?.sessionId}
              onClick={() => restoreTab(session)}
              ref={index === selectedIndex ? selectedRef : null}
              className={`${s.tab_list_item} ${
                index === selectedIndex ? s.tab_list_item_selected : ''
              }`}
              style={{ opacity: 0.6 }}
            >
              <img src={session.tab?.favIconUrl} width={16} height={16} />

              <span className={s.tab_list_text}>
                <p className={s.tab_list_title}>{session.tab?.title}</p>

                <p className={s.tab_list_subtitle}>
                  {getDomain(session.tab?.url)} · {t(lang, 'closed')}
                </p>
              </span>
            </li>
          ))
        ) : (
          <>
            {filteredTabs.map((tab, index) => (
              <li
                key={tab.id}
                onClick={() => openTab(tab)}
                ref={index === selectedIndex ? selectedRef : null}
                className={`${s.tab_list_item} ${
                  index === selectedIndex ? s.tab_list_item_selected : ''
                } ${
                  index === selectedIndex && isMoveMode
                    ? s.tab_list_item_moving
                    : ''
                }`}
              >
                <img src={tab.favIconUrl} width={16} height={16} />

                <span className={s.tab_list_text}>
                  <p className={s.tab_list_title}>{tab.title}</p>

                  <p className={s.tab_list_subtitle}>{getDomain(tab.url)}</p>
                </span>

                {isBookmarked(tab.url) && (
                  <span
                    className={s.tab_list_bookmark_mark}
                    title={t(lang, 'bookmarked')}
                  >
                    ★
                  </span>
                )}

                {tab.pinned && (
                  <span className={s.tab_list_pinned}>{t(lang, 'pinned')}</span>
                )}
              </li>
            ))}

            {filteredBookmarks.map((bookmark, bookmarkIndex) => {
              const index = filteredTabs.length + bookmarkIndex

              return (
                <li
                  key={bookmark.id}
                  onClick={() => openBookmark(bookmark)}
                  ref={index === selectedIndex ? selectedRef : null}
                  className={`${s.tab_list_item} ${
                    index === selectedIndex ? s.tab_list_item_selected : ''
                  }`}
                >
                  <span className={s.tab_list_bookmark_icon}>★</span>

                  <span className={s.tab_list_text}>
                    <p className={s.tab_list_title}>
                      {bookmark.title || bookmark.url}
                    </p>

                    <p className={s.tab_list_subtitle}>
                      {getDomain(bookmark.url)} · {t(lang, 'bookmark')}
                    </p>
                  </span>
                </li>
              )
            })}
          </>
        )}
      </ul>

      <div className={s.search_instructions}>
        <button
          type="button"
          className={s.lang_toggle}
          onClick={toggleLang}
          title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
        >
          {lang.toUpperCase()}
        </button>

        <div className={s.search_instructions_icons}>
          <p className={s.search_instructions_icon}>
            <span>↑ ↓ {t(lang, 'navigate')}</span>
          </p>

          <p className={s.search_instructions_icon}>
            <span>← {t(lang, 'close')}</span>
          </p>

          <p className={s.search_instructions_icon}>
            <span>→ {t(lang, 'pin')}</span>
          </p>

          <p className={s.search_instructions_icon}>
            <span>
              ⌃m {isMoveMode ? t(lang, 'stopMoving') : t(lang, 'move')}
            </span>
          </p>

          <p className={s.search_instructions_icon}>
            <span>↵ {t(lang, 'open')}</span>
          </p>
        </div>
      </div>
    </>
  )
}

export default App
