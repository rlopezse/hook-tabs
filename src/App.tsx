import { useEffect, useRef, useState } from 'react'
import s from './App.module.css'
import { t, type Lang } from './i18n'
import { flattenBookmarks } from './utils/flattenBookmarks'
import { getDomain } from './utils/getDomain'
import { isBookmarked } from './utils/isBookmarked'
import { filterTabs } from './actions/filterTabs'
import { restoreTab } from './actions/restoreTab'
import { openBookmark } from './actions/openBookmark'
import { openTab } from './actions/openTab'
import { toggleLang } from './actions/toggleLang'
import { handleKeyDown } from './handlers/handleKeyDown'

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

  useEffect(() => {
    document.title = t(lang, 'appTitle')
    document.documentElement.lang = lang
  }, [lang])

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
          onChange={(e) =>
            filterTabs({
              search: e.target.value,
              tabs,
              bookmarks,
              setFilteredTabs,
              setFilteredBookmarks,
              setSelectedIndex,
              setIsMoveMode,
              setClosedTabs,
            })
          }
          onKeyDown={(e) =>
            handleKeyDown(e, {
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
            })
          }
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

                {isBookmarked(tab.url, bookmarkedUrls) && (
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
                  onClick={() => openBookmark(bookmark, sourceWindowId)}
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
          onClick={() => toggleLang(lang, setLang)}
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
