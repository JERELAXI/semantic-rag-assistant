// Service worker — opens SidePanel on action click, auto-closes on domain change

// Disable panel globally; enable per-tab only when the user explicitly opens it.
chrome.sidePanel.setOptions({ enabled: false })

// Track the origin each tab's panel was opened on (in-memory; resets on service-worker restart).
const panelOrigins: Record<number, string> = {}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return
  // setOptions must complete before open() is called, so we await it.
  await chrome.sidePanel.setOptions({ tabId: tab.id, enabled: true })
  chrome.sidePanel.open({ tabId: tab.id })
  if (tab.url) {
    try { panelOrigins[tab.id] = new URL(tab.url).origin } catch { /* ignore non-parseable URLs */ }
  }
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!(tabId in panelOrigins)) return
  if (!tab.url) return

  let newOrigin: string
  try {
    newOrigin = new URL(tab.url).origin
  } catch {
    return
  }

  if (newOrigin !== panelOrigins[tabId]) {
    delete panelOrigins[tabId]
    // Disable closes the panel; re-enable restores the "can be opened" state for this tab.
    await chrome.sidePanel.setOptions({ tabId, enabled: false })
    await chrome.sidePanel.setOptions({ tabId, enabled: true })
  }
})
