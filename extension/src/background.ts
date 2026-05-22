// Service worker — opens SidePanel on action click, auto-closes on domain change

// Track the origin each tab's panel was opened on (in-memory; resets on service-worker restart).
const panelOrigins: Record<number, string> = {}

// open() must be called synchronously within the user-gesture frame — any await before it
// causes Chrome to silently drop the call (user-gesture token expires on suspension).
// Everything after open() can be async.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return
  chrome.sidePanel.open({ tabId: tab.id })
  if (tab.url) {
    try { panelOrigins[tab.id] = new URL(tab.url).origin } catch { /* ignore non-parseable URLs */ }
  }

  // Extract page text and write to storage so the SidePanel banner can offer "Add to KB".
  // Fails silently on chrome:// pages, PDFs, and extension pages — no banner is fine there.
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        url: location.href,
        text: (document.body?.innerText ?? '').slice(0, 500_000),
      }),
    })
    if (result) {
      await chrome.storage.local.set({
        page_info: { title: result.title, url: result.url, textLength: result.text.length, text: result.text },
      })
    }
  } catch { /* privileged pages — skip */ }
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
