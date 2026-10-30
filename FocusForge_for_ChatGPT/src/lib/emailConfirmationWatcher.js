// Check only while signup is waiting on this device. Credentials stay in the
// caller's component memory; they are never written to browser storage.
export function watchEmailConfirmation({
  check,
  onError = () => {},
  onChecking = () => {},
  windowTarget = window,
  documentTarget = document,
  schedule = setTimeout,
  cancel = clearTimeout,
  now = Date.now,
}) {
  let stopped = false
  let busy = false
  let timer
  let nativeActive = true
  let lastAttempt = -Infinity
  let retryDelay = 5000
  const active = () => nativeActive && documentTarget.visibilityState !== 'hidden'
  const clearTimer = () => { cancel(timer); timer = undefined }
  const queue = (delay) => {
    clearTimer()
    if (!stopped && active()) timer = schedule(run, delay)
  }
  async function run() {
    clearTimer()
    if (stopped || busy || !active()) return
    const remaining = 1000 - (now() - lastAttempt)
    if (remaining > 0) { queue(remaining); return }
    busy = true
    onChecking(true)
    lastAttempt = now()
    try {
      await check()
      stopped = true
    } catch (error) {
      if (stopped) return
      const code = error?.code
      if (code === 'invalid_credentials' || code === 'user_banned') {
        onChecking(false)
        stopped = true
        onError('Please return to Log In and sign in with your current password.')
      } else {
        // Unconfirmed emails are expected. Back off after network/rate-limit
        // failures rather than repeatedly submitting requests in a tight loop.
        retryDelay = code === 'email_not_confirmed' ? 5000 : Math.min(retryDelay * 2, 60000)
        onError(code === 'email_not_confirmed' ? '' : 'Unable to check right now. We’ll retry when you’re connected.')
      }
    } finally {
      busy = false
      if (!stopped) onChecking(false)
      queue(retryDelay)
    }
  }
  const resume = () => { if (active()) void run(); else clearTimer() }
  const nativeState = (event) => {
    nativeActive = event.detail?.state === 'active'
    resume()
  }
  windowTarget.addEventListener('focus', resume)
  windowTarget.addEventListener('online', resume)
  windowTarget.addEventListener('focusforge-app-state-change', nativeState)
  documentTarget.addEventListener('visibilitychange', resume)
  void run()
  return () => {
    stopped = true
    clearTimer()
    windowTarget.removeEventListener('focus', resume)
    windowTarget.removeEventListener('online', resume)
    windowTarget.removeEventListener('focusforge-app-state-change', nativeState)
    documentTarget.removeEventListener('visibilitychange', resume)
  }
}
