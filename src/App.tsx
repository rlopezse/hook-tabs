import { useEffect, useRef, useState } from "react";
import s from "./App.module.css";

function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [filteredTabs, setfilteredTabs] = useState<chrome.tabs.Tab[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    chrome.tabs.query({}, (tabs) => {
      setTabs(tabs);
      setfilteredTabs(tabs);
    });

    inputRef.current?.focus();
  }, []);

  const filterTabs = (search: string) => {
    const filteredTabs = tabs.filter((tab) =>
      tab.url?.toLowerCase().includes(search.toLowerCase())
    );

    setfilteredTabs(filteredTabs);
    setSelectedIndex(0);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();

        setSelectedIndex((current) =>
          Math.min(current + 1, filteredTabs.length - 1)
        );

        break;

      case "ArrowUp":
        e.preventDefault();

        setSelectedIndex((current) =>
          Math.max(current - 1, 0)
        );

        break;

      case "Enter":
        e.preventDefault();

        if (filteredTabs[selectedIndex]) {
          openTab(filteredTabs[selectedIndex]);
        }

        break;

      case "Escape":
        window.close();
        break;
    }
  };

  const openTab = (tab: chrome.tabs.Tab) => {
    if (!tab.id || !tab.windowId) return;

    chrome.tabs.update(tab.id, {
      active: true,
    });

    chrome.windows.update(tab.windowId, {
      focused: true,
    });

    window.close();
  };

  const getDomain = (url?: string) => {
  if (!url) return "";

    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  };

  return (
    <>
      <div className={s.search}>
      <input
        ref={inputRef}
        placeholder="Buscar pestaña..."
        onChange={(e) => filterTabs(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      </div>

      <ul className={s.tab_list}>
        {filteredTabs.map((tab, index) => (
            <li
              key={tab.id}
              onClick={() => openTab(tab)}
              className={`${s.tab_list_item} ${index === selectedIndex ? s.tab_list_item_selected : ""}`}
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
  );
}

export default App;

