let hookTabsWindowId = null;

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-hook-tabs") return;

  if (hookTabsWindowId !== null) {
    try {
      await chrome.windows.update(hookTabsWindowId, {
        focused: true,
      });

      return;
    } catch {
      hookTabsWindowId = null;
    }
  }

  const currentWindow = await chrome.windows.getLastFocused();

  const width = 700;
  const height = 600;

  const left = Math.round(
    (currentWindow.left ?? 0) +
      ((currentWindow.width ?? width) - width) / 2
  );

  const top = Math.round(
    (currentWindow.top ?? 0) +
      ((currentWindow.height ?? height) - height) / 2
  );

  const popup = await chrome.windows.create({
    url: chrome.runtime.getURL("index.html"),
    type: "popup",
    width,
    height,
    left,
    top,
  });

  hookTabsWindowId = popup.id;
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === hookTabsWindowId) {
    hookTabsWindowId = null;
  }
});
