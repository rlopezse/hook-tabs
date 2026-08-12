import { useEffect, useRef, useState } from 'react'
import s from './App.module.css'

function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [filteredTabs, setfilteredTabs] = useState<chrome.tabs.Tab[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      const validTabs = tabs.filter(
        (tab) => !tab.url?.startsWith(chrome.runtime.getURL('')),
      )

      setTabs(validTabs)
      setfilteredTabs(validTabs)
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
  }

  useEffect(() => {
    const handleBlur = () => {
      setTimeout(() => {
        if (!document.hasFocus()) {
          window.close();
        }
      }, 100);
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()

        setSelectedIndex((current) =>
          Math.min(current + 1, filteredTabs.length - 1),
        )

        break

      case 'ArrowUp':
        e.preventDefault()

        setSelectedIndex((current) => Math.max(current - 1, 0))

        break

      case 'Enter':
        e.preventDefault()

        if (filteredTabs[selectedIndex]) {
          openTab(filteredTabs[selectedIndex])
        }

        break

      case 'ArrowLeft':
        e.preventDefault()
        if (filteredTabs[selectedIndex]) {
          closeTab(filteredTabs[selectedIndex])
        }
        break

      case 'ArrowRight':
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
        <input
          ref={inputRef}
          placeholder="Buscar pestaña"
          onChange={(e) => filterTabs(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <ul className={s.tab_list}>
        {filteredTabs.map((tab, index) => (
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
        ))}
      </ul>
    </>
  )
}

export default App
