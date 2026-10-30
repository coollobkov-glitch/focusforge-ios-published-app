import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import useStore from './store/useStore'
import useDailyReset from './lib/useDailyReset'
import BlockScreen from './screens/BlockScreen'
import './index.css'

// Standalone entry point for the shield block screen.
//
// This exists purely for startup speed. The full app entry (main.jsx) pulls in
// every screen, including the Dashboard's charting library — and because the
// build inlines everything into one file, all of that code is parsed and run
// before anything can render, even when the user is only ever going to see the
// block screen. This entry imports the block screen and nothing else, so the
// shield path loads a fraction of the code.
//
// The tradeoff: leaving the block screen means loading the full app, which is
// handled by the `home` handoff below.

function BlockRoot() {
  const showBlockScreen = useStore((s) => s.showBlockScreen)
  const triggerBlockScreen = useStore((s) => s.triggerBlockScreen)

  // Distinguishes "not shown yet" from "the user dismissed it", so the handoff
  // below can only ever fire on an actual dismissal.
  const hasShownRef = useRef(false)

  useDailyReset()

  // A deep link arriving while this page is already open re-triggers the block
  // screen (native dispatches this event on the shield notification tap).
  useEffect(() => {
    const handleShieldUnlock = () => triggerBlockScreen('a blocked app')
    window.addEventListener('focusforge-shield-unlock', handleShieldUnlock)
    return () => window.removeEventListener('focusforge-shield-unlock', handleShieldUnlock)
  }, [])

  useEffect(() => {
    if (showBlockScreen) {
      hasShownRef.current = true
      return
    }

    // Loaded without the `?blocked=` param for some reason — this page only
    // ever shows the block screen, so put it into that state.
    if (!hasShownRef.current) {
      triggerBlockScreen('a blocked app')
      return
    }

    // Dismissed: hand off to the full app, whose URL native passes in as
    // `home` (asset URLs are resolved at runtime, so they can't be hardcoded).
    const home = new URLSearchParams(window.location.search).get('home')
    if (home) window.location.replace(home)
  }, [showBlockScreen])

  if (!showBlockScreen) return null

  return <BlockScreen />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BlockRoot />
  </React.StrictMode>,
)
