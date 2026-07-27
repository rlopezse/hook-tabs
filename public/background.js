chrome.commands.onCommand.addListener((command) => {
  if (command !== "open-hook-tabs") {
    return;
  }

  chrome.windows.getCurrent((currentWindow) => {
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

    chrome.windows.create({
      url: chrome.runtime.getURL("index.html"),
      type: "popup",
      width,
      height,
      left,
      top,
    });
  });
});
