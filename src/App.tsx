import { useEffect, useRef, useState } from 'react'
import s from './App.module.css'

export const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
    <path
      fill="#171717"
      d="M21.017 7.992c.398.566-.076 1.258-.769 1.258H3a1 1 0 0 1-1-1V6.42C2 3.98 3.98 2 6.42 2h2.32c1.63 0 2.14.53 2.79 1.4l1.4 1.86c.31.41.35.46.93.46h2.79c1.805 0 3.402.897 4.367 2.272M21.983 11.747a1 1 0 0 0-1-.997H3a1 1 0 0 0-1 1v4.9C2 19.6 4.4 22 7.35 22h9.3C19.6 22 22 19.6 22 16.65zM14.54 16.97l-2.15 1.88a.58.58 0 0 1-.78 0l-2.15-1.88c-.68-.6-.77-1.62-.2-2.33.57-.72 1.6-.85 2.34-.3l.4.3.4-.3c.74-.55 1.77-.42 2.34.3.57.71.48 1.73-.2 2.33"
    />
  </svg>
)

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

  const togglePinTab = (tab: chrome.tabs.Tab) => {
    if (!tab.id) return

    chrome.tabs.update(tab.id, {
      pinned: !tab.pinned,
    })

    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tab.id ? { ...t, pinned: !t.pinned } : t)),
    )

    setfilteredTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === tab.id ? { ...t, pinned: !t.pinned } : t)),
    )
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
            width: '18',
            height: '18',
            fillRule: 'evenodd',
            clipRule: 'evenodd',
            position: 'absolute',
            top: 'calc(50% - 9px)',
            left: '16px',
          }}
          viewBox="0 0 24 24"
        >
          <path
            d="M11.5 21a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19M22 22l-2-2"
            style={{
              stroke: '#171717',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: '1.5',
              fill: 'none',
            }}
          />
        </svg>
        <input
          ref={inputRef}
          placeholder="Buscar pestaña"
          onChange={(e) => filterTabs(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <ul className={s.tab_list}>
        {filteredTabs.length === 0 && closedTabs.length === 0 ? (
          <li className={s.tab_list_notfound}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlSpace="preserve"
              style={{
                width: '32',
                height: '32',
                margin: '0 auto 8px',
                fillRule: 'evenodd',
                clipRule: 'evenodd',
              }}
              viewBox="0 0 24 24"
            >
              <path
                d="M21.017 7.992c.398.566-.076 1.258-.769 1.258H3a1 1 0 0 1-1-1V6.42C2 3.98 3.98 2 6.42 2h2.32c1.63 0 2.14.53 2.79 1.4l1.4 1.86c.31.41.35.46.93.46h2.79c1.805 0 3.402.897 4.367 2.272M21.983 11.746a1 1 0 0 0-1-.996H3a1 1 0 0 0-1 1v4.9C2 19.6 4.4 22 7.35 22h9.3C19.6 22 22 19.6 22 16.65zM14.34 18.28c-.15.14-.34.22-.53.22s-.39-.08-.53-.22l-1.24-1.24-1.28 1.28c-.14.14-.34.22-.53.22s-.38-.08-.53-.22a.754.754 0 0 1 0-1.06l1.28-1.28-1.24-1.24a.754.754 0 0 1 0-1.06c.3-.29.77-.29 1.06 0l1.24 1.24 1.2-1.2c.29-.29.76-.29 1.06 0 .29.3.29.77 0 1.06l-1.2 1.2 1.24 1.24c.29.29.29.77 0 1.06"
                style={{ fill: '#171717', fillRule: 'nonzero' }}
              />
            </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlSpace="preserve"
                  style={{
                    width: '14',
                    height: '14',
                    opacity: 0.6,
                    fillRule: 'evenodd',
                    clipRule: 'evenodd',
                    strokeLinejoin: 'round',
                    strokeMiterlimit: 2,
                  }}
                  viewBox="0 0 800 800"
                >
                  <path
                    d="m394.832 364.989 111.403-111.424c5.099-5.056 7.253-12.352 5.824-19.392a21.33 21.33 0 0 0-13.013-15.509c-75.584-30.144-132.821-23.616-157.077-18.389L207.376 85.757c2.667-45.312-21.696-76.181-22.827-77.589-3.776-4.715-9.408-7.595-15.467-7.936-5.995-.213-11.968 1.963-16.235 6.229L6.246 153.064a21.25 21.25 0 0 0-6.208 16.32 21.2 21.2 0 0 0 8.043 15.467c26.197 20.821 58.944 23.019 76.331 22.571L199.953 343.23c-4.203 24.277-9.621 83.819 18.965 155.605 2.645 6.677 8.469 11.541 15.488 13.013 1.451.277 2.88.427 4.309.427a21.24 21.24 0 0 0 15.083-6.251l110.869-110.869 110.848 110.869a21.28 21.28 0 0 0 15.083 6.251 21.28 21.28 0 0 0 15.083-6.251c8.341-8.341 8.341-21.824 0-30.165z"
                    style={{ fillRule: 'nonzero' }}
                    transform="matrix(-1.561 0 0 1.561 800 0)"
                  />
                </svg>
              )}
            </li>
          ))
        )}
      </ul>
    </>
  )
}

export default App
