import { useEffect, useRef, useState } from 'react'
import s from './App.module.css'

function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [filteredTabs, setfilteredTabs] = useState<chrome.tabs.Tab[]>([])
  const [closedTabs, setClosedTabs] = useState<chrome.sessions.Session[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedRef = useRef<HTMLLIElement>(null)
  const isShowingClosedTabs = filteredTabs.length === 0 && closedTabs.length > 0

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      const validTabs = tabs.filter(
        (tab) => !tab.url?.startsWith(chrome.runtime.getURL('')),
      )

      setTabs(validTabs)
      setfilteredTabs(validTabs)

      const activeIndex = validTabs.findIndex((tab) => tab.active)

      setSelectedIndex(activeIndex === -1 ? 0 : activeIndex)
    })

    inputRef.current?.focus()
  }, [])

  const filterTabs = (search: string) => {
    const searchLower = search.toLowerCase()

    const filteredTabs = tabs.filter((tab) => {
      if (tab.url?.startsWith(chrome.runtime.getURL(''))) {
        return false
      }

      return (
        tab.title?.toLowerCase().includes(searchLower) ||
        tab.url?.toLowerCase().includes(searchLower)
      )
    })

    setfilteredTabs(filteredTabs)
    setSelectedIndex(0)

    if (filteredTabs.length === 0 && searchLower) {
      chrome.sessions.getRecentlyClosed({ maxResults: 25 }, (sessions) => {
        const closedTabs = sessions.filter(
          (session) =>
            session.tab &&
            (session.tab.title?.toLowerCase().includes(searchLower) ||
              session.tab.url?.toLowerCase().includes(searchLower)),
        )

        setClosedTabs(closedTabs)
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
    const activeLength = isShowingClosedTabs
      ? closedTabs.length
      : filteredTabs.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()

        if (activeLength > 0) {
          setSelectedIndex((current) => (current + 1) % activeLength)
        }

        break

      case 'ArrowUp':
        e.preventDefault()

        if (activeLength > 0) {
          setSelectedIndex(
            (current) => (current - 1 + activeLength) % activeLength,
          )
        }

        break

      case 'Enter':
        e.preventDefault()

        if (isShowingClosedTabs) {
          if (closedTabs[selectedIndex]) {
            restoreTab(closedTabs[selectedIndex])
          }
        } else if (filteredTabs[selectedIndex]) {
          openTab(filteredTabs[selectedIndex])
        }

        break

      case 'ArrowLeft':
      case '<':
        e.preventDefault()
        if (filteredTabs[selectedIndex]) {
          closeTab(filteredTabs[selectedIndex])
        }
        break

      case 'w':
      case 'W':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          if (filteredTabs[selectedIndex]) {
            closeTab(filteredTabs[selectedIndex])
          }
        }
        break

      case 'ArrowRight':
      case '>':
        e.preventDefault()
        if (filteredTabs[selectedIndex]) {
          togglePinTab(filteredTabs[selectedIndex])
        }
        break

      case 'Escape':
        window.close()
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

    setfilteredTabs((prevTabs) => prevTabs.filter((t) => t.id !== tab.id))

    setSelectedIndex((current) => Math.max(current - 1, 0))
  }

  const reorderByPinned = (tabs: chrome.tabs.Tab[]) =>
    [...tabs].sort((a, b) => Number(b.pinned) - Number(a.pinned))

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

    setfilteredTabs((prevTabs) => {
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
        <path d="M14.386 14.386l4.0877 4.0877-4.0877-4.0877c-2.9418 2.9419-7.7115 2.9419-10.6533 0-2.9419-2.9418-2.9419-7.7115 0-10.6533 2.9418-2.9419 7.7115-2.9419 10.6533 0 2.9419 2.9418 2.9419 7.7115 0 10.6533z" stroke="currentColor" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
        <input
          ref={inputRef}
          placeholder="Buscar pestaña"
          onChange={(e) => filterTabs(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span>esc</span>
      </div>

      <ul className={s.tab_list}>
        {filteredTabs.length === 0 && closedTabs.length === 0 ? (
          <li className={s.tab_list_notfound}>
            <span>No se encontraron pestañas con ese nombre</span>
          </li>
        ) : isShowingClosedTabs ? (
          closedTabs.map((session, index) => (
            <li
              key={session.tab?.sessionId}
              onClick={() => restoreTab(session)}
              ref={index === selectedIndex ? selectedRef : null}
              className={`${s.tab_list_item} ${index === selectedIndex ? s.tab_list_item_selected : ''}`}
              style={{ opacity: 0.6 }}
            >
              <img src={session.tab?.favIconUrl} width={16} height={16} />
              <span className={s.tab_list_text}>
                <p className={s.tab_list_title}>{session.tab?.title}</p>
                <p className={s.tab_list_subtitle}>
                  {getDomain(session.tab?.url)} · Cerrada
                </p>
              </span>
            </li>
          ))
        ) : (
          filteredTabs.map((tab, index) => (
            <li
              key={tab.id}
              onClick={() => openTab(tab)}
              ref={index === selectedIndex ? selectedRef : null}
              className={`${s.tab_list_item} ${index === selectedIndex ? s.tab_list_item_selected : ''}`}
            >
              <img src={tab.favIconUrl} width={16} height={16} />
              <span className={s.tab_list_text}>
                <p className={s.tab_list_title}>{tab.title}</p>
                <p className={s.tab_list_subtitle}>{getDomain(tab.url)}</p>
              </span>
              {tab.pinned && (
                <span className={s.tab_list_pinned}>pin</span>
              )}
            </li>
          ))
        )}
      </ul>
    </>
  )
}

export default App
