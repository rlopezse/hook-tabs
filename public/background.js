const HOOK_WINDOWS_KEY = 'hookTabsWindows';

const getHookWindows = async () => {
  const result = await chrome.storage.session.get(HOOK_WINDOWS_KEY);

  return result[HOOK_WINDOWS_KEY] ?? {};
};

const setHookWindow = async (chromeWindowId, hookWindowId) => {
  const hookWindows = await getHookWindows();

  hookWindows[chromeWindowId] = hookWindowId;

  await chrome.storage.session.set({
    [HOOK_WINDOWS_KEY]: hookWindows,
  });
};

const removeHookWindow = async (chromeWindowId) => {
  const hookWindows = await getHookWindows();

  delete hookWindows[chromeWindowId];

  await chrome.storage.session.set({
    [HOOK_WINDOWS_KEY]: hookWindows,
  });
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-hook-tabs') return;

  const currentWindow = await chrome.windows.getLastFocused();

  if (currentWindow.id === undefined) return;

  const hookWindows = await getHookWindows();
  const existingHookWindowId = hookWindows[currentWindow.id];

  // Hook Tabs already exists for this window
  if (existingHookWindowId !== undefined) {
    try {
      await chrome.windows.update(existingHookWindowId, {
        focused: true,
      });

      return;
    } catch {
      // The window no longer exists
      await removeHookWindow(currentWindow.id);
    }
  }

  const width = 758;
  const height = 368;

  const left = Math.round(
    (currentWindow.left ?? 0) +
      ((currentWindow.width ?? width) - width) / 2,
  );

  const top = Math.round(
    (currentWindow.top ?? 0) +
      ((currentWindow.height ?? height) - height) / 2,
  );

  const popup = await chrome.windows.create({
    url: `${chrome.runtime.getURL('index.html')}?windowId=${currentWindow.id}`,
    type: 'popup',
    width,
    height,
    left,
    top,
  });

  if (popup.id !== undefined) {
    await setHookWindow(currentWindow.id, popup.id);
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const hookWindows = await getHookWindows();

  const chromeWindowId = Object.keys(hookWindows).find(
    (key) => hookWindows[key] === windowId,
  );

  if (chromeWindowId !== undefined) {
    await removeHookWindow(Number(chromeWindowId));
  }
});
