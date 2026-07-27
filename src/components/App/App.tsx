import { useEffect, useRef, useState } from "react";

function App() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [filteredTabs, setfilteredTabs] = useState<chrome.tabs.Tab[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  //const [selectedIndex, setSelectedIndex] = useState(0);

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
      <div>
      <h2>Pestañas abiertas</h2>

      <input
        ref={inputRef}
        placeholder=""
        onChange={(e) => filterTabs(e.target.value)}
      />

      <ul>
        {filteredTabs.map((tab) => (
          <li key={tab.id} onClick={() => openTab(tab)}>{tab.title}</li>
        ))}
      </ul>
      </div>
    </>
  );
}

export default App;
