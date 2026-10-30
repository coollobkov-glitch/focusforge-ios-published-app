import { useEffect } from 'react'
import useStore from '../store/useStore'

// How often to re-check the date while the app sits in the foreground. Cheap:
// checkDailyReset is a localStorage read plus a string compare on same-day
// calls, so this only does real work on the one tick that crosses midnight.
const POLL_MS = 60_000

// Keeps daily progress in sync with the actual date.
//
// Calling checkDailyReset() once on mount is not enough on iOS: the app is a
// WebView that stays alive while backgrounded, so returning to it the next day
// does not remount React and the mount effect never runs again — counters like
// distractionAttempts stayed on yesterday's numbers until the app was
// force-quit. So re-check whenever the page becomes visible again (app
// foregrounded) and on a slow interval, which also covers the app being left
// open across midnight.
export default function useDailyReset() {
  useEffect(() => {
    // Read from the store on each call so this never closes over a stale action.
    const check = () => useStore.getState().checkDailyReset()

    const onVisibility = () => {
      if (!document.hidden) check()
    }

    check()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', check)
    const id = setInterval(check, POLL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', check)
      clearInterval(id)
    }
  }, [])
}
