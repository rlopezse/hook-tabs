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
            <span>
              <p className={s.tab_list_title}>{tab.title}</p>
              <p className={s.tab_list_subtitle}>{getDomain(tab.url)}</p>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default App
