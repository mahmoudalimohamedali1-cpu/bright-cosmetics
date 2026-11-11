/*
  New-order alert for the open dashboard: a chime, a count in the tab title
  and, when the tab is in the background and the browser allows it, a system
  notification. The "New order" switch in Settings → Notifications turns it
  off (stored in this browser only, like the rest of that pane).
*/

const NOTIFY_KEY = 'nuri-admin-notify'
const TITLE_BADGE = /^\(\d+\) /

export function newOrderAlertsOn(): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(NOTIFY_KEY) ?? '{}') as { newOrder?: boolean }
    return v.newOrder !== false
  } catch {
    return true
  }
}

let ctx: AudioContext | undefined

/** Browsers only allow sound after the person has clicked or typed on the page. */
function audio(): AudioContext | undefined {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return undefined
  }
}

/** Unlock sound on the first click or key press, so the first order can be heard. */
export function primeSound() {
  const unlock = () => {
    audio()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  return unlock
}

/** Two rising notes, played three times so it is noticed across the room. */
export function playChime() {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + 0.05
  for (let r = 0; r < 3; r++) {
    for (const [i, f] of [880, 1318.5].entries()) {
      const at = t0 + r * 0.7 + i * 0.18
      const osc = a.createOscillator()
      const gain = a.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45)
      osc.connect(gain).connect(a.destination)
      osc.start(at)
      osc.stop(at + 0.5)
    }
  }
}

let unseen = 0

/** "(3) Bright Admin" until the tab is looked at again. */
export function badgeTitle(add: number) {
  if (document.visibilityState === 'visible' && document.hasFocus()) return
  unseen += add
  document.title = `(${unseen}) ${document.title.replace(TITLE_BADGE, '')}`
}

export function clearTitleBadge() {
  unseen = 0
  document.title = document.title.replace(TITLE_BADGE, '')
}

export function systemNotify(title: string, body: string, onClick: () => void) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  try {
    const n = new Notification(title, { body, tag: 'bright-new-order', icon: `${import.meta.env.BASE_URL}favicon.svg` })
    n.onclick = () => {
      window.focus()
      onClick()
      n.close()
    }
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export const canAskNotify = () => typeof Notification !== 'undefined' && Notification.permission === 'default'
