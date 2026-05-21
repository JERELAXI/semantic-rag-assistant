// Content script — injects a floating "Add to KB" button on every page

const ACCENT = '#6ACD8E'
const ACCENT_SHADOW = 'rgba(106, 205, 142, 0.45)'
const BTN_ID = '__rag_add_btn'

function injectButton(): void {
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
    // Limit to 50 000 chars to avoid huge payloads
    const text = document.body.innerText.slice(0, 50_000)
    const title = document.title || window.location.hostname
    const url = window.location.href

    btn.textContent = 'Sending…'
    btn.style.opacity = '0.75'
    btn.style.cursor = 'default'

    chrome.runtime.sendMessage({ type: 'PAGE_TEXT', text, title, url }, (response) => {
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
      }, 2500)
    })
  })

  document.body.appendChild(btn)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectButton)
} else {
  injectButton()
}
