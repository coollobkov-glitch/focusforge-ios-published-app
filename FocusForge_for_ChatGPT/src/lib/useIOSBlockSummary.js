import { useEffect, useState } from 'react'

export function isIOSNative() {
  return typeof window !== 'undefined'
    && !!window.FocusForgeNative
    && window.FocusForgeNative.platform === 'ios'
}

const EMPTY = { applicationsCount: 0, categoriesCount: 0, isAuthorized: false }

// The real state of the iOS shield, straight from the native module.
//
// The store's `blockedApps` list is Android package names picked during
// onboarding — on iOS it describes nothing that is actually being blocked, since
// the shield is driven by the FamilyActivitySelection made in the system picker.
// Those tokens are deliberately opaque (Apple never hands over app names or
// bundle IDs), so counts plus authorization status is the whole of what iOS
// will tell us. Anything more specific would be made up.
export default function useIOSBlockSummary() {
  const [summary, setSummary] = useState(EMPTY)
  const isIOS = isIOSNative()

  useEffect(() => {
    if (!isIOS) return
    let cancelled = false

    const load = () => {
      window.FocusForgeNative.getSelectionSummary()
        .then((res) => {
          if (!cancelled && res && res.success !== false) setSummary(res)
        })
        .catch(() => {})
    }

    load()
    // The selection can change from the Settings tab while this stays mounted,
    // and the picker itself backgrounds the WebView — so refresh on foreground.
    const onVisibility = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isIOS])

  return { summary, setSummary, isIOS }
}
