// Content script — injects a floating "Add to KB" button on eligible pages

const ACCENT = '#6ACD8E'
const ACCENT_SHADOW = 'rgba(106, 205, 142, 0.45)'
const BTN_ID = '__rag_add_btn'

const BLOCKED_HOSTS = new Set([
  'www.youtube.com', 'youtube.com',
  'twitter.com', 'x.com',
  'www.facebook.com', 'facebook.com',
  'www.instagram.com', 'instagram.com',
  'www.reddit.com', 'reddit.com',
  'www.tiktok.com', 'tiktok.com',
])

// Returns true if the URL is unconditionally a document (skip text-length check)
function isAlwaysDocument(): boolean {
  const { hostname, pathname } = window.location
  if (hostname === 'docs.google.com') return true
  if (hostname === 'drive.google.com' && pathname.startsWith('/viewer')) return true
  return false
}

function isEligible(): boolean {
  const { protocol, hostname, pathname } = window.location

  if (protocol === 'chrome:' || protocol === 'chrome-extension:' || protocol === 'about:') return false
  if (BLOCKED_HOSTS.has(hostname)) return false
  if (hostname === 'www.google.com' && pathname.startsWith('/search')) return false

  if (isAlwaysDocument()) return true

  return document.body.innerText.length > 500
}

// Returns a backend-downloadable URL for pages whose content can't be scraped via innerText
function getFileUrl(): string | null {
  const { hostname, pathname } = window.location

  // Google Docs: export as plain text
  if (hostname === 'docs.google.com') {
    const match = pathname.match(/\/document\/d\/([^/]+)/)
    if (match) return `https://docs.google.com/document/d/${match[1]}/export?format=txt`
  }

  // Google Drive file viewer: direct download
  if (hostname === 'drive.google.com') {
    const match = pathname.match(/\/file\/d\/([^/]+)/)
    if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`
  }

  return null
}

function injectButton(): void {
  if (!isEligible()) return
  if (document.getElementById(BTN_ID)) return

  const btn = document.createElement('button')
  btn.id = BTN_ID
  btn.textContent = '+ Add to KB'

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    padding: '9px 18px',
    background: ACCENT,
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: `0 4px 16px ${ACCENT_SHADOW}`,
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    lineHeight: '1',
    userSelect: 'none',
  })

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px)'
    btn.style.boxShadow = `0 6px 22px ${ACCENT_SHADOW}`
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0)'
    btn.style.boxShadow = `0 4px 16px ${ACCENT_SHADOW}`
  })

  btn.addEventListener('click', () => {
    const title = document.title || window.location.hostname
    const url = window.location.href
    const fileUrl = getFileUrl()

    btn.textContent = 'Sending…'
    btn.style.opacity = '0.75'
    btn.style.cursor = 'default'

    const payload = fileUrl
      ? { type: 'PAGE_TEXT', fileUrl, title, url }
      : { type: 'PAGE_TEXT', text: document.body.innerText.slice(0, 50_000), title, url }

    chrome.runtime.sendMessage(payload, (response) => {
      if (response?.ok) {
        btn.textContent = '✓ Sent to SidePanel'
        btn.style.background = '#4ade80'
        btn.style.opacity = '1'
      } else {
        btn.textContent = '✗ Failed'
        btn.style.background = '#E5534B'
        btn.style.opacity = '1'
      }
      setTimeout(() => {
        btn.textContent = '+ Add to KB'
        btn.style.background = ACCENT
        btn.style.cursor = 'pointer'
        btn.style.opacity = '1'
      }, 2500)
    })
  })

  document.body.appendChild(btn)
}

// Initial attempt after 2 s to let async pages (Google Docs, SPAs) populate their DOM
setTimeout(() => {
  injectButton()

  // If button wasn't injected yet (text still loading), poll every 3 s for up to 15 s
  if (!document.getElementById(BTN_ID)) {
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 3000
      injectButton()
      if (document.getElementById(BTN_ID) || elapsed >= 15000) clearInterval(interval)
    }, 3000)
  }
}, 2000)
