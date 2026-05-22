// Service worker — opens SidePanel on action click and brokers PAGE_TEXT from content scripts

// Disable the panel globally so it only appears for tabs we explicitly enable it on.
chrome.sidePanel.setOptions({ enabled: false })

chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.sidePanel.setOptions({ tabId: tab.id, enabled: true })
    chrome.sidePanel.open({ tabId: tab.id })
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
    // Open the SidePanel only for the sender's tab
    const tabId = sender.tab?.id
    if (tabId !== undefined) {
      chrome.sidePanel.setOptions({ tabId, enabled: true })
      chrome.sidePanel.open({ tabId })
    }
    sendResponse({ ok: true })
    return true
  }

  return false
})
