import { useEffect, useRef, useState } from "react";

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
      tab.title?.toLowerCase().includes(search.toLowerCase())
    );

    setfilteredTabs(filteredTabs);
    setSelectedIndex(0);
  };

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

  return (
    <>
      <input
        ref={inputRef}
        placeholder=""
        onChange={(e) => filterTabs(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <ul>
        {filteredTabs.map((tab, index) => (
            <li
              key={tab.id}
              onClick={() => openTab(tab)}
              style={{
                background: index === selectedIndex ? "#ddd" : "transparent",
                cursor: "pointer",
                padding: "6px",
              }}
            >
            <img src={tab.favIconUrl} width={16} height={16} />
              {tab.title}
              {tab.title}
            </li>
          ))}
      </ul>
    </>
  );
}

export default App;

