export const restoreTab = (session: chrome.sessions.Session) => {
  if (!session.tab?.sessionId) return

  chrome.sessions.restore(session.tab.sessionId)

  window.close()
}
