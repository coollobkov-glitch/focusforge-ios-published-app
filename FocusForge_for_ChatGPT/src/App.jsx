import React, { useEffect, useRef, useState } from 'react'
import useStore from './store/useStore'
import { auth, supabase } from './lib/supabase'
import useDailyReset from './lib/useDailyReset'
import { setActiveAccountOnNative, syncBlockedAppsToNative } from './lib/nativeBridge'
import Welcome from './screens/Welcome'
import Onboarding from './screens/Onboarding'
import Login from './screens/Login'
import ResetPassword from './screens/ResetPassword'
import Dashboard from './screens/Dashboard'
import Tasks from './screens/Tasks'
import Habits from './screens/Habits'
import Focus from './screens/Focus'
import Analytics from './screens/Analytics'
import Settings from './screens/Settings'
import BlockScreen from './screens/BlockScreen'
import BottomNav from './components/BottomNav'

function SubscriptionGate({ refreshSubscriptionStatus }) {
  const [openingPaywall, setOpeningPaywall] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState('Choose a plan to unlock FocusForge.')
  const openedAutomatically = useRef(false)

  const openPaywall = async () => {
    if (openingPaywall || !window.FocusForgeNative?.presentPaywall) return
    setOpeningPaywall(true)
    try {
      const result = await window.FocusForgeNative.presentPaywall('campaign_trigger')
      if (result?.success === false) {
        setMessage(result.error || 'Plans could not be opened. Please try again.')
        return
      }
      const status = await refreshSubscriptionStatus()
      if (status !== 'ACTIVE') setMessage('An active subscription is required to continue.')
    } catch (error) {
      setMessage('The paywall could not be opened. Check your connection and try again.')
    } finally {
      setOpeningPaywall(false)
    }
  }

  const restorePurchases = async () => {
    if (restoring || !window.FocusForgeNative?.restorePurchases) return
    setRestoring(true)
    try {
      await window.FocusForgeNative.restorePurchases()
      const status = await refreshSubscriptionStatus()
      if (status !== 'ACTIVE') setMessage('No active FocusForge Pro purchase was found.')
    } catch (error) {
      setMessage('Your purchases could not be restored. Please try again.')
    } finally {
      setRestoring(false)
    }
  }

  const logOut = async () => {
    try {
      await auth.signOut()
    } catch (error) {
      console.error('Sign out failed', error)
    } finally {
      await setActiveAccountOnNative(null)
      await syncBlockedAppsToNative([])
      localStorage.removeItem('focusforge_user_id')
      localStorage.removeItem('focusforge_paywall_after_onboarding_pending')
      window.location.reload()
    }
  }

  useEffect(() => {
    if (openedAutomatically.current) return
    openedAutomatically.current = true
    localStorage.removeItem('focusforge_paywall_after_onboarding_pending')
    openPaywall()
  }, [])

  return (
    <div className="h-full w-full max-w-md mx-auto bg-dark-950 px-6 flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-forge-500/15 border border-forge-400/30 flex items-center justify-center text-forge-300 text-2xl mb-6">ϟ</div>
      <p className="text-forge-300 text-xs font-bold tracking-[0.24em] uppercase">FocusForge Pro</p>
      <h1 className="ff-title text-3xl mt-3">Build a life with focus.</h1>
      <p className="text-dark-400 text-sm leading-relaxed mt-3 max-w-xs">{message}</p>
      <button
        onClick={openPaywall}
        disabled={openingPaywall}
        className="w-full mt-7 rounded-xl bg-forge-300 hover:bg-forge-200 disabled:opacity-60 text-dark-950 font-bold py-3.5 transition-colors"
      >
        {openingPaywall ? 'Opening plans…' : 'Choose your plan'}
      </button>
      <button
        onClick={restorePurchases}
        disabled={restoring}
        className="mt-4 text-sm text-dark-400 hover:text-dark-200 disabled:opacity-60"
      >
        {restoring ? 'Restoring purchases…' : 'Restore purchases'}
      </button>
      <button
        onClick={logOut}
        className="mt-5 text-sm font-medium text-red-400 hover:text-red-300"
      >
        Log out
      </button>
    </div>
  )
}

function App() {
  const { hasOnboarded, currentTab, showBlockScreen, isLoading, loadUserData, triggerBlockScreen } = useStore()
  const [showWelcome, setShowWelcome] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [authCallbackState, setAuthCallbackState] = useState('idle')
  const [isIOSNative, setIsIOSNative] = useState(() => window.FocusForgeNative?.platform === 'ios')
  const [subscriptionStatus, setSubscriptionStatus] = useState('UNKNOWN')
  const processedAuthUrlsRef = useRef(new Set())

  // Check if user is coming from password reset link
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=recovery')) {
      setShowResetPassword(true)
      setShowWelcome(false)
      setShowLogin(false)
    }
  }, [])

  // Check if app was opened from block screen (native blocker)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const blockedApp = params.get('blocked')
    if (blockedApp) {
      triggerBlockScreen(blockedApp)
    }
  }, [])

  // Listen for iOS shield unlock deep link event
  useEffect(() => {
    const handleShieldUnlock = () => {
      triggerBlockScreen('a blocked app')
    }
    window.addEventListener('focusforge-shield-unlock', handleShieldUnlock)
    return () => window.removeEventListener('focusforge-shield-unlock', handleShieldUnlock)
  }, [])

  useEffect(() => {
    const updateNativePlatform = () => setIsIOSNative(window.FocusForgeNative?.platform === 'ios')
    updateNativePlatform()
    window.addEventListener('focusforge-native-ready', updateNativePlatform)
    return () => window.removeEventListener('focusforge-native-ready', updateNativePlatform)
  }, [])

  const refreshSubscriptionStatus = async () => {
    if (!window.FocusForgeNative?.getSubscriptionStatus) return 'UNKNOWN'
    const result = await window.FocusForgeNative.getSubscriptionStatus()
    const status = result?.subscriptionStatus?.status || 'UNKNOWN'
    setSubscriptionStatus(status)
    return status
  }

  useEffect(() => {
    if (!hasOnboarded || !isIOSNative) return
    refreshSubscriptionStatus().catch(() => setSubscriptionStatus('UNKNOWN'))
    const interval = window.setInterval(() => {
      refreshSubscriptionStatus().catch(() => {})
    }, 2000)
    return () => window.clearInterval(interval)
  }, [hasOnboarded, isIOSNative])

  useEffect(() => {
    const completeEmailConfirmation = async (url) => {
      if (!url || processedAuthUrlsRef.current.has(url)) return
      processedAuthUrlsRef.current.add(url)
      setAuthCallbackState('verifying')
      try {
        const callbackUrl = new URL(url)
        const hash = new URLSearchParams(callbackUrl.hash.slice(1))
        const linkError = callbackUrl.searchParams.get('error') || hash.get('error')
        const linkErrorDescription = callbackUrl.searchParams.get('error_description') || hash.get('error_description')
        if (linkError || linkErrorDescription) {
          throw new Error(linkErrorDescription || 'This confirmation link could not be used. Please request a new link.')
        }

        const code = callbackUrl.searchParams.get('code') || hash.get('code')
        const tokenHash = callbackUrl.searchParams.get('token_hash') || hash.get('token_hash')
        const type = callbackUrl.searchParams.get('type') || hash.get('type')
        const accessToken = hash.get('access_token') || callbackUrl.searchParams.get('access_token')
        const refreshToken = hash.get('refresh_token') || callbackUrl.searchParams.get('refresh_token')
        const isRecovery = callbackUrl.pathname === '/reset' || type === 'recovery'

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (error) throw error
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) throw error
        } else {
          throw new Error('This confirmation link is missing a valid Supabase token. Please request a new link.')
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('The confirmation link did not return a session. Please request a new link.')

        // Password-reset links sign the user in just long enough to choose a
        // new password; they sign in fresh from the login screen afterwards.
        if (isRecovery) {
          setShowResetPassword(true)
          setShowWelcome(false)
          setShowLogin(false)
          setAuthCallbackState('idle')
          return
        }

        // The store keys everything by the users-table profile id, not the
        // auth id — resolve it so confirmation still works when localStorage
        // is empty (fresh install) or the link was opened on another device.
        let userId = localStorage.getItem('focusforge_user_id')
        if (!userId) {
          const profile = await auth.ensureProfile(session.user)
          userId = profile.id
        }
        localStorage.setItem('focusforge_user_id', userId)
        localStorage.setItem('focusforge_has_account', 'true')
        localStorage.removeItem('focusforge_pending_email_confirmation')
        useStore.setState({ userId, hasOnboarded: true, awaitingEmailConfirmation: false })
        await loadUserData()
        setAuthCallbackState('idle')
      } catch (error) {
        console.error('Email confirmation failed', error)
        setAuthCallbackState(error.message || 'Verification could not be completed. Please request a new link.')
      }
    }

    const handleAuthCallback = (event) => completeEmailConfirmation(event.detail?.url)
    window.addEventListener('focusforge-auth-callback', handleAuthCallback)
    const initialUrl = window.FocusForgeNative?.pendingAuthUrl
    if (initialUrl) {
      window.FocusForgeNative.pendingAuthUrl = ''
      completeEmailConfirmation(initialUrl)
    }
    return () => window.removeEventListener('focusforge-auth-callback', handleAuthCallback)
  }, [loadUserData])

  // Reset daily progress on mount, on every foreground, and across midnight.
  useDailyReset()

  // Listen for auth state changes (email verification, token refresh, etc.).
  // Deliberately deferred until after the first paint: subscribing kicks off a
  // session/token-refresh network round trip, and doing that during startup
  // competes with rendering for the main thread — which is what made opening
  // the app feel like it was waiting on the network. Nothing on screen depends
  // on it (all data is read from localStorage), so it can wait a beat.
  useEffect(() => {
    let subscription
    let cancelled = false

    const subscribe = () => {
      if (cancelled) return
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event)

        // When user confirms their email (from verification link)
        if (event === 'SIGNED_IN' && session) {
          const userId = localStorage.getItem('focusforge_user_id')
          if (userId && !useStore.getState().hasOnboarded && !useStore.getState().awaitingEmailConfirmation
            && !localStorage.getItem('focusforge_pending_email_confirmation')) {
            // User just verified their email — load their data and log them in
            useStore.setState({ hasOnboarded: true })
            await loadUserData()
          }
        }

        // When user clicks password reset link
        if (event === 'PASSWORD_RECOVERY') {
          setShowResetPassword(true)
          setShowWelcome(false)
          setShowLogin(false)
        }
      })
      subscription = data.subscription
    }

    const handle = window.requestIdleCallback
      ? window.requestIdleCallback(subscribe, { timeout: 1500 })
      : setTimeout(subscribe, 250)

    return () => {
      cancelled = true
      if (window.cancelIdleCallback && window.requestIdleCallback) window.cancelIdleCallback(handle)
      else clearTimeout(handle)
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (hasOnboarded) {
      loadUserData()
    }
  }, [hasOnboarded])

  // SubscriptionGate is the single owner of automatic paywall presentation.

  // Check if user has been here before (skip welcome screen)
  useEffect(() => {
    const hasSeenApp = localStorage.getItem('focusforge_has_account')
    if (!hasOnboarded && hasSeenApp) {
      setShowWelcome(false)
      setShowLogin(true)
    }
  }, [hasOnboarded])

  if (authCallbackState !== 'idle') {
    const verifying = authCallbackState === 'verifying'
    return (
      <div className="h-full w-full max-w-md mx-auto bg-dark-950 flex items-center justify-center px-6">
        <div className="text-center">
          {verifying && <div className="w-10 h-10 border-3 border-forge-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />}
          <p className="ff-title text-2xl">{verifying ? 'Verifying your email…' : 'Verification needs another try'}</p>
          <p className="text-dark-400 text-sm leading-relaxed mt-3">{verifying ? 'We are signing you in and preparing your FocusForge plan.' : authCallbackState}</p>
        </div>
      </div>
    )
  }

  // Show password reset screen if coming from reset link
  if (showResetPassword) {
    return <ResetPassword />
  }

  if (!hasOnboarded) {
    // Show welcome screen first
    if (showWelcome && !showLogin && !showSignup) {
      return (
        <Welcome
          onLogin={() => {
            setShowWelcome(false)
            setShowLogin(true)
          }}
          onSignup={() => {
            setShowWelcome(false)
            setShowSignup(true)
          }}
        />
      )
    }

    // Show login screen
    if (showLogin) {
      return (
        <Login
          onSignup={() => {
            setShowLogin(false)
            setShowSignup(true)
          }}
        />
      )
    }

    // Show signup/onboarding
    return <Onboarding onLogin={() => {
      setShowSignup(false)
      setShowWelcome(false)
      setShowLogin(true)
    }} />
  }

  // Checked BEFORE the loading gate on purpose. The block screen only needs
  // local data, so it must never sit behind a "Loading your data..." spinner —
  // that ordering is what could stall the shield → block screen path.
  if (showBlockScreen) {
    return <BlockScreen />
  }

  if (isLoading) {
    return (
      <div className="h-full w-full max-w-md mx-auto bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-forge-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400 text-sm">Loading your data...</p>
        </div>
      </div>
    )
  }

  if (isIOSNative && hasOnboarded && subscriptionStatus === 'UNKNOWN') {
    return (
      <div className="h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-forge-500/15 border border-forge-400/30 flex items-center justify-center text-forge-300 text-2xl">ϟ</div>
        <div className="w-6 h-6 mt-5 border-2 border-forge-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isIOSNative && hasOnboarded && subscriptionStatus !== 'ACTIVE') {
    return <SubscriptionGate refreshSubscriptionStatus={refreshSubscriptionStatus} />
  }

  const renderScreen = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />
      case 'tasks': return <Tasks />
      case 'habits': return <Habits />
      case 'focus': return <Focus />
      case 'analytics': return <Analytics />
      case 'settings': return <Settings />
      default: return <Dashboard />
    }
  }

  return (
    <div className="ff-app-shell h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {renderScreen()}
      </div>
      <BottomNav />
    </div>
  )
}

export default App
