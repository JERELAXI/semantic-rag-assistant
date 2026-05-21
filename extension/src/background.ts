// Service worker — opens SidePanel on action click and brokers PAGE_TEXT from content scripts

chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId })
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PAGE_TEXT') {
    // Store in chrome.storage.local so it survives service-worker restarts
    chrome.storage.local.set({
      pendingPageText: {
        text: msg.text as string,
        title: msg.title as string,
        url: msg.url as string,
      },
    })
    // Open the SidePanel in the sender's window
    const windowId = sender.tab?.windowId
    if (windowId !== undefined) {
      chrome.sidePanel.open({ windowId })
    }
    sendResponse({ ok: true })
    return true
  }

  return false
})
