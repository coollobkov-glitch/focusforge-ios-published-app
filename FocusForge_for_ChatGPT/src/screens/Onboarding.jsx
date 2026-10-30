import React, { useEffect, useState } from 'react'
import { Shield, Target, Flame, Timer, ArrowRight, ChevronRight, Sparkles, Plus, X, Check, Crown, Star, ListPlus, Lock, Mail, AlertCircle, LoaderCircle } from 'lucide-react'
import useStore from '../store/useStore'
import { auth, getAuthErrorMessage } from '../lib/supabase'
import { getSignupErrors } from '../lib/signupValidation'
import { getSetupErrors } from '../lib/setupValidation'
import { ForgeMark, ForgeWordmark } from './ForgeBrand'
import ResendConfirmation from './ResendConfirmation'
import { watchEmailConfirmation } from '../lib/emailConfirmationWatcher'

const TOTAL_STEPS = 6

const SUGGESTED_HABITS = [
  { title: 'Morning Workout', icon: '💪', color: '#22c55e' },
  { title: 'Prayer', icon: '🤲', color: '#37d6e6' },
  { title: 'Journaling', icon: '📝', color: '#f59e0b' },
  { title: 'Read 20 Pages', icon: '📖', color: '#2598f4' },
  { title: 'Study 2 Hours', icon: '📚', color: '#ec4899' },
  { title: 'Drink 8 Glasses Water', icon: '💧', color: '#06b6d4' },
  { title: 'Sleep by 11 PM', icon: '🌙', color: '#217eea' },
  { title: 'No Social Media', icon: '🚫', color: '#ef4444' },
  { title: 'Meditate', icon: '🧘', color: '#14b8a6' },
  { title: 'Walk 10,000 Steps', icon: '🚶', color: '#84cc16' },
  { title: 'Cold Shower', icon: '🚿', color: '#0ea5e9' },
  { title: 'Cook Healthy Meal', icon: '🥗', color: '#10b981' },
  { title: 'Stretch / Yoga', icon: '🧘‍♂️', color: '#a78bfa' },
  { title: 'Practice Gratitude', icon: '🙏', color: '#f472b6' },
  { title: 'No Junk Food', icon: '🍎', color: '#ef4444' },
  { title: 'Learn Something New', icon: '🧠', color: '#f97316' },
]

const APP_LIST = [
  { name: 'Instagram', icon: '📸', package: 'com.instagram.android' },
  { name: 'TikTok', icon: '🎵', package: 'com.zhiliaoapp.musically' },
  { name: 'YouTube', icon: '▶️', package: 'com.google.android.youtube' },
  { name: 'X (Twitter)', icon: '🐦', package: 'com.twitter.android' },
  { name: 'Facebook', icon: '👤', package: 'com.facebook.katana' },
  { name: 'Snapchat', icon: '👻', package: 'com.snapchat.android' },
  { name: 'Reddit', icon: '🔴', package: 'com.reddit.frontpage' },
  { name: 'Netflix', icon: '🎬', package: 'com.netflix.mediaclient' },
  { name: 'WhatsApp', icon: '💬', package: 'com.whatsapp' },
  { name: 'Telegram', icon: '✈️', package: 'org.telegram.messenger' },
  { name: 'Discord', icon: '🎮', package: 'com.discord' },
  { name: 'Twitch', icon: '🟣', package: 'tv.twitch.android.app' },
  { name: 'Pinterest', icon: '📌', package: 'com.pinterest' },
  { name: 'Spotify', icon: '🎧', package: 'com.spotify.music' },
  { name: 'Games', icon: '🎮', package: 'com.games.generic' },
  { name: 'BeReal', icon: '📷', package: 'com.bereal.ft' },
]

const HABIT_COLORS = ['#22c55e', '#37d6e6', '#f59e0b', '#2598f4', '#ec4899', '#06b6d4', '#217eea', '#ef4444', '#14b8a6', '#f97316']
const HABIT_ICONS = ['💪','🤲','📝','📖','📚','💧','🌙','🚫','🧘','🚶','🚿','🥗','🧠','🎯','🏃','⚡']

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current ? 'w-8 bg-forge-500' : i < current ? 'w-4 bg-forge-700' : 'w-4 bg-dark-700'
          }`}
        />
      ))}
    </div>
  )
}

export default function Onboarding({ onLogin }) {
  const [step, setStep] = useState(0)
  const { completeOnboarding } = useStore()

  // Step data
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [intention, setIntention] = useState('')

  // Tasks
  const [primaryTask, setPrimaryTask] = useState('')
  const [secondaryTasks, setSecondaryTasks] = useState(['', ''])
  const [additionalTasks, setAdditionalTasks] = useState([])

  // Habits
  const [selectedHabits, setSelectedHabits] = useState([])
  const [customHabit, setCustomHabit] = useState('')
  const [customHabitIcon, setCustomHabitIcon] = useState('🎯')
  const [customHabitError, setCustomHabitError] = useState('')
  const [showStepErrors, setShowStepErrors] = useState(false)

  // Blocked apps
  const [selectedApps, setSelectedApps] = useState([])
  const [isIOSNative, setIsIOSNative] = useState(() => typeof window !== 'undefined' && window.FocusForgeNative?.platform === 'ios')
  const [iosSummary, setIosSummary] = useState({ applicationsCount: 0, categoriesCount: 0 })
  const [iosPickerBusy, setIosPickerBusy] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState('')
  const [checkingConfirmation, setCheckingConfirmation] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)

  useEffect(() => {
    if (!verificationSent) return
    return watchEmailConfirmation({
      check: () => useStore.getState().signIn(email.trim(), password.trim(), { background: true }),
      onError: setVerificationStatus,
      onChecking: setCheckingConfirmation,
    })
  }, [verificationSent, email, password])

  useEffect(() => {
    const updatePlatform = () => setIsIOSNative(window.FocusForgeNative?.platform === 'ios')
    updatePlatform()
    window.addEventListener('focusforge-native-ready', updatePlatform)
    return () => window.removeEventListener('focusforge-native-ready', updatePlatform)
  }, [])

  useEffect(() => {
    if (!isIOSNative) return
    window.FocusForgeNative.getSelectionSummary().then((res) => {
      if (res?.success !== false) {
        setIosSummary({
          applicationsCount: res.applicationsCount || 0,
          categoriesCount: res.categoriesCount || 0,
        })
      }
    }).catch(() => {})
  }, [isIOSNative])

  const [showSignupErrors, setShowSignupErrors] = useState(false)
  const signupErrors = getSignupErrors({ name, email, password, intention })
  const accountErrors = [...signupErrors, ...(emailError && !signupErrors.some(message => message.toLowerCase().includes('email')) ? [emailError] : []), ...(checkingEmail ? ['Please wait while your email is checked.'] : [])]
  const setupErrors = getSetupErrors({ primaryTask, secondaryTasks, additionalTasks, selectedHabits, customHabit, isIOSNative, iosSummary, selectedApps, iosPickerBusy })
  const stepErrors = step === 1 ? accountErrors : (setupErrors[step] || [])
  const setupErrorPanel = showStepErrors && stepErrors.length > 0 ? (
    <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <p className="text-sm font-semibold text-red-400">Complete this step to continue:</p>
      <ul className="mt-1 list-disc pl-4 text-xs text-red-300">{stepErrors.map(message => <li key={message}>{message}</li>)}</ul>
    </div>
  ) : null
  const handleNext = () => {
    if (step === 1 && accountErrors.length) {
      setShowSignupErrors(true)
      return
    }
    if (stepErrors.length) {
      setShowStepErrors(true)
      return
    }
    setShowSignupErrors(false)
    setShowStepErrors(false)
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  }
  const handleBack = () => { setShowStepErrors(false); setShowSignupErrors(false); setStep(s => Math.max(s - 1, 0)) }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailBlur = () => {
    if (!email.trim()) return
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError('')
  }

  const toggleHabit = (habit) => {
    setSelectedHabits(prev =>
      prev.find(h => h.title === habit.title)
        ? prev.filter(h => h.title !== habit.title)
        : [...prev, habit]
    )
  }

  const addCustomHabit = () => {
    if (!customHabit.trim()) { setCustomHabitError('Write a name for your custom habit.'); return }
    if (selectedHabits.some(h => h.title.toLowerCase() === customHabit.trim().toLowerCase())) { setCustomHabitError('That habit is already selected. Choose a different name.'); return }
    setCustomHabitError('')
    const color = HABIT_COLORS[selectedHabits.length % HABIT_COLORS.length]
    const icon = customHabitIcon
    setSelectedHabits(prev => [...prev, { title: customHabit.trim(), icon, color }])
    setCustomHabit('')
  }

  const toggleApp = (app) => {
    setSelectedApps(prev =>
      prev.find(a => a.name === app.name)
        ? prev.filter(a => a.name !== app.name)
        : [...prev, app]
    )
  }

  const handleIOSPickApps = async () => {
    if (!isIOSNative || iosPickerBusy) return
    setIosPickerBusy(true)
    try {
      const res = await window.FocusForgeNative.presentPicker()
      if (res && !res.cancelled) {
        setIosSummary({
          applicationsCount: res.applicationsCount || 0,
          categoriesCount: res.categoriesCount || 0,
        })
      }
    } finally {
      setIosPickerBusy(false)
    }
  }

  const handleFinish = async () => {
    if (accountErrors.length) {
      setShowSignupErrors(true)
      setStep(1)
      return
    }
    const incompleteStep = [2, 3, 4].find(index => setupErrors[index].length)
    if (incompleteStep) { setStep(incompleteStep); setShowStepErrors(true); return }
    setSaving(true)
    setError('')
    
    try {
      const tasks = []
      if (primaryTask.trim()) tasks.push({ title: primaryTask.trim(), taskType: 'primary' })
      secondaryTasks.forEach(t => { if (t.trim()) tasks.push({ title: t.trim(), taskType: 'secondary' }) })
      additionalTasks.forEach(t => { if (t.trim()) tasks.push({ title: t.trim(), taskType: 'additional' }) })

      const blockedApps = selectedApps.map(a => ({ name: a.name, icon: a.icon, package: a.package, active: true, attempts: 0 }))

      const habits = selectedHabits.map(h => ({ title: h.title, icon: h.icon, color: h.color, completed: false }))

      localStorage.setItem('focusforge_paywall_after_onboarding_pending', 'true')
      const result = await completeOnboarding({
        email: email.trim(),
        password: password.trim(),
        name: name.trim() || 'User',
        intention: intention.trim(),
        tasks,
        habits,
        blockedApps,
      })

      // If email confirmation is needed, show verification screen
      if (result?.needsEmailConfirmation) {
        setVerificationSent(true)
      }
    } catch (err) {
      localStorage.removeItem('focusforge_paywall_after_onboarding_pending')
      console.error('Finish error:', err)
      setError(getAuthErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // ── Email Verification Screen ──
  if (verificationSent) {
    return (
      <div className="ff-screen ff-email-confirmation h-full w-full max-w-md mx-auto bg-dark-950">
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-6 text-center">
          <div className="mb-6"><ForgeWordmark compact /></div>
          <Mail size={32} aria-hidden="true" className="text-forge-300 mb-4 shrink-0" />
          <h1 className="ff-title text-2xl mb-3">Check Your Email</h1>
          <p className="text-dark-400 text-sm mb-2">We sent a confirmation link to:</p>
          <p className="text-forge-400 text-sm font-semibold break-all mb-4 max-w-xs">{email}</p>
          <p className="text-dark-400 text-sm max-w-xs mb-4">
            Open the link on any device, then return here. We’ll check immediately and sign you in once confirmed.
          </p>
          <div role="status" aria-live="polite" className="text-dark-400 text-sm max-w-xs min-h-16 flex flex-col items-center justify-center gap-2 mb-4">
            {checkingConfirmation && <LoaderCircle size={20} aria-hidden="true" className="animate-spin text-forge-400 shrink-0" />}
            <p>{checkingConfirmation
              ? 'Checking email confirmation…'
              : verificationStatus || 'Waiting for confirmation. Checking every 5 seconds.'}</p>
          </div>
          <ResendConfirmation email={email} />
          <p className="text-dark-500 text-xs mb-2">No email? Check your spam folder.</p>
          <button type="button" onClick={onLogin} className="text-forge-400 text-sm min-h-11 px-4 py-3 shrink-0">
            Back to Log In
          </button>
        </div>
      </div>
    )
  }

  // ── Step 0: Welcome ──
  if (step === 0) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="ff-logo-stage mb-7"><ForgeMark size={82} /></div>
          <div className="mb-7"><ForgeWordmark /></div>
          <span className="ff-kicker mb-3">FORGE YOUR FOCUS</span>
          <h1 className="ff-title text-4xl text-center mb-4 leading-tight">
            Turn Distractions{'\n'}into Discipline
          </h1>
          <p className="text-dark-400 text-center text-base leading-relaxed max-w-xs">
            Build the habit of choosing intention over impulse — one blocked distraction at a time.
          </p>
        </div>
        <div className="px-8 pb-12">
          <ProgressDots current={step} total={TOTAL_STEPS} />
          <button
            onClick={handleNext}
            className="w-full mt-6 bg-gradient-to-r from-forge-400 to-forge-600 text-dark-950 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-forge-600/20"
          >
            Let's Set Up Your App
            <ChevronRight size={18} />
          </button>
          <button
            onClick={onLogin}
            className="w-full mt-3 border border-dark-700 bg-dark-900 text-dark-200 font-medium py-3.5 rounded-2xl hover:border-forge-500 transition-colors"
          >
            Already have an account? Log In
          </button>
        </div>
      </div>
    )
  }

  // ── Step 1: Name + Intention ──
  if (step === 1) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col">
        <div className="flex-1 px-8 pt-16 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-forge-600 to-forge-400 flex items-center justify-center mb-6">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="ff-title text-3xl mb-2">About You</h1>
          <p className="text-dark-400 text-sm mb-8">Let's personalize your experience.</p>

          <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 block">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm focus:outline-none focus:border-forge-500 transition-colors mb-4"
            autoFocus
          />

          <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 block">Email</label>
          <div className="relative mb-4">
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              onBlur={handleEmailBlur}
              placeholder="your@email.com"
              className={`w-full bg-dark-900 border rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm focus:outline-none transition-colors ${
                showSignupErrors && emailError ? 'border-red-500 focus:border-red-500' : 'border-dark-700 focus:border-forge-500'
              }`}
            />
            {checkingEmail && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-forge-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {showSignupErrors && emailError && (
            <div className="flex items-start gap-2 mb-4 -mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-xs">{emailError}</p>
            </div>
          )}

          <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm focus:outline-none focus:border-forge-500 transition-colors mb-6"
          />

          <p className="text-dark-500 text-xs -mt-4 mb-6">Password requirement: at least 6 characters.</p>
          <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2 block">Your Intention (required)</label>
          <p className="text-dark-500 text-xs mb-3">This will appear on your focus screen to remind you of your purpose.</p>
          <textarea
            value={intention}
            onChange={e => setIntention(e.target.value)}
            placeholder="Become a disciplined engineer who builds things that matter..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm resize-none h-24 focus:outline-none focus:border-forge-500 transition-colors"
          />
        </div>
        <div className="px-8 pb-12 pt-4">
          <ProgressDots current={step} total={TOTAL_STEPS} />
          {showSignupErrors && accountErrors.length > 0 && (
            <div id="signup-errors" role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-red-400">Complete these fields to continue:</p>
              <ul className="mt-1 list-disc pl-4 text-xs text-red-300">
                {accountErrors.map(message => <li key={message}>{message}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="px-6 py-4 rounded-2xl bg-dark-800 text-dark-300 font-medium text-sm hover:bg-dark-700 transition-colors">Back</button>
            <button
              onClick={handleNext}
              className={`flex-1 bg-white text-dark-950 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-dark-100 transition-colors ${accountErrors.length ? 'opacity-40' : ''}`}
              aria-describedby={showSignupErrors && accountErrors.length ? 'signup-errors' : undefined}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Tasks ──
  if (step === 2) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col">
        <div className="flex-1 px-8 pt-16 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center mb-6">
            <Target size={28} className="text-white" />
          </div>
          <h1 className="ff-title text-3xl mb-2">Set Your Tasks</h1>
          <p className="text-dark-400 text-sm mb-8">Write three tasks: your primary task and two secondary tasks. You can change these later.</p>

          {/* Primary */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={14} className="text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Primary Task (required)</span>
              <span className="text-[10px] text-dark-500 ml-1">Your #1 priority</span>
            </div>
            <input
              type="text"
              value={primaryTask}
              onChange={e => setPrimaryTask(e.target.value)}
              placeholder="Your most important task today..."
              className="w-full bg-dark-900 border border-yellow-400/30 rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm focus:outline-none focus:border-yellow-400/60 transition-colors"
            />
          </div>

          {/* Secondary */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Star size={14} className="text-forge-400" />
              <span className="text-xs font-bold text-forge-400 uppercase tracking-wider">Secondary Tasks</span>
              <span className="text-[10px] text-dark-500 ml-1">Both required</span>
            </div>
            {secondaryTasks.map((task, i) => (
              <input
                key={i}
                type="text"
                value={task}
                onChange={e => {
                  const next = [...secondaryTasks]
                  next[i] = e.target.value
                  setSecondaryTasks(next)
                }}
                placeholder={`Secondary task ${i + 1}...`}
                className="w-full bg-dark-900 border border-forge-500/30 rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm focus:outline-none focus:border-forge-500/60 transition-colors mb-2"
              />
            ))}
          </div>

          {/* Additional */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ListPlus size={14} className="text-dark-400" />
              <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">Additional Tasks</span>
              <span className="text-[10px] text-dark-500 ml-1">Optional</span>
            </div>
            {additionalTasks.map((task, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={task}
                  onChange={e => {
                    const next = [...additionalTasks]
                    next[i] = e.target.value
                    setAdditionalTasks(next)
                  }}
                  placeholder={`Additional task...`}
                  className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-3.5 text-white placeholder-dark-500 text-sm focus:outline-none focus:border-dark-500 transition-colors"
                />
                {additionalTasks.length > 0 && (
                  <button onClick={() => setAdditionalTasks(prev => prev.filter((_, j) => j !== i))} className="text-dark-600 hover:text-red-400 transition-colors px-2">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setAdditionalTasks(prev => [...prev, ''])}
              className="flex items-center gap-1.5 text-xs font-medium text-dark-500 hover:text-dark-300 transition-colors mt-1"
            >
              <Plus size={13} /> Add another
            </button>
          </div>
        </div>
        <div className="px-8 pb-12 pt-4">
          <ProgressDots current={step} total={TOTAL_STEPS} />
          {setupErrorPanel}
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="px-6 py-4 rounded-2xl bg-dark-800 text-dark-300 font-medium text-sm hover:bg-dark-700 transition-colors">Back</button>
            <button
              onClick={handleNext}
              className={`flex-1 bg-white text-dark-950 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-dark-100 transition-colors ${stepErrors.length ? 'opacity-40' : ''}`} 
            >
              Continue
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Habits ──
  if (step === 3) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col">
        <div className="flex-1 px-8 pt-16 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mb-6">
            <Flame size={28} className="text-white" />
          </div>
          <h1 className="ff-title text-3xl mb-2">Build Your Habits</h1>
          <p className="text-dark-400 text-sm mb-6">Choose at least two habits to track daily. Select suggestions, create your own, or combine both.</p>

          {/* Suggested habits grid */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {SUGGESTED_HABITS.map(habit => {
              const isSelected = selectedHabits.find(h => h.title === habit.title)
              return (
                <button
                  key={habit.title}
                  onClick={() => toggleHabit(habit)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-forge-600/15 border-forge-500/40 ring-1 ring-forge-500/20'
                      : 'bg-dark-900 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <span className="text-lg">{habit.icon}</span>
                  <span className={`text-xs font-medium ${isSelected ? 'text-forge-300' : 'text-dark-300'}`}>{habit.title}</span>
                  {isSelected && <Check size={13} className="text-forge-400 ml-auto flex-shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Custom habit */}
          <label className="block text-xs font-semibold text-dark-400 mb-2">Create your own habit</label>
          <div className="flex gap-2 flex-wrap mb-3" role="group" aria-label="Custom habit icon">
            {HABIT_ICONS.map(icon => <button key={icon} aria-label={`Choose ${icon} icon`} aria-pressed={customHabitIcon === icon} onClick={() => setCustomHabitIcon(icon)} className={`w-9 h-9 rounded-lg ${customHabitIcon === icon ? 'bg-forge-600/20 ring-1 ring-forge-500' : 'bg-dark-800'}`}>{icon}</button>)}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customHabit}
              onChange={e => { setCustomHabit(e.target.value); setCustomHabitError('') }}
              placeholder="Add a custom habit..."
              className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 text-white placeholder-dark-500 text-sm focus:outline-none focus:border-forge-500 transition-colors"
              onKeyDown={e => e.key === 'Enter' && addCustomHabit()}
            />
            <button onClick={addCustomHabit} className="bg-forge-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-forge-500 transition-colors">
              Add
            </button>
          </div>

          {customHabitError && <p role="alert" className="text-red-400 text-xs mt-2">{customHabitError}</p>}
          {selectedHabits.filter(h => !SUGGESTED_HABITS.some(s => s.title === h.title)).map(habit => (
            <div key={habit.title} className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-dark-900 border border-forge-500/30">
              <span>{habit.icon}</span><span className="flex-1 text-sm">{habit.title}</span>
              <button aria-label={`Remove ${habit.title}`} onClick={() => toggleHabit(habit)} className="p-2 text-dark-400"><X size={16} /></button>
            </div>
          ))}
          {/* Selected count */}
          {selectedHabits.length > 0 && (
            <p className="text-dark-500 text-xs mt-3">{selectedHabits.length} habit{selectedHabits.length !== 1 ? 's' : ''} selected</p>
          )}
        </div>
        <div className="px-8 pb-12 pt-4">
          <ProgressDots current={step} total={TOTAL_STEPS} />
          {setupErrorPanel}
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="px-6 py-4 rounded-2xl bg-dark-800 text-dark-300 font-medium text-sm hover:bg-dark-700 transition-colors">Back</button>
            <button
              onClick={handleNext}
              className={`flex-1 bg-white text-dark-950 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-dark-100 transition-colors ${stepErrors.length ? 'opacity-40' : ''}`} 
            >
              Continue
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 4: Block Apps ──
  if (step === 4) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col">
        <div className="flex-1 px-8 pt-16 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center mb-6">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="ff-title text-3xl mb-2">Block Distractions</h1>
          <p className="text-dark-400 text-sm mb-6">{isIOSNative ? 'Choose apps and categories with Apple Screen Time. FocusForge will protect that selection across your iPhone or iPad.' : 'Select the apps that steal your focus. When you try to open them, FocusForge will remind you of your goals.'}</p>

          {isIOSNative ? (
            <div className="rounded-2xl border border-forge-700/30 bg-gradient-to-r from-forge-900/30 to-dark-900 p-4">
              <div className="flex items-center gap-2 mb-2 text-forge-300">
                <Shield size={16} />
                <p className="text-sm font-semibold">Apple Screen Time</p>
              </div>
              <p className="text-xs leading-relaxed text-dark-400">Apple keeps your selected apps private. You can select individual apps, app categories, or both.</p>
              <button
                onClick={handleIOSPickApps}
                disabled={iosPickerBusy}
                className="mt-4 w-full rounded-xl bg-forge-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-forge-500 disabled:opacity-50"
              >
                {iosPickerBusy ? 'Opening Screen Time…' : (iosSummary.applicationsCount || iosSummary.categoriesCount ? 'Change apps to block' : 'Choose apps to block')}
              </button>
              {(iosSummary.applicationsCount > 0 || iosSummary.categoriesCount > 0) && (
                <p className="mt-3 text-center text-xs text-dark-300">
                  {iosSummary.applicationsCount} app{iosSummary.applicationsCount === 1 ? '' : 's'}{iosSummary.categoriesCount > 0 ? ` + ${iosSummary.categoriesCount} categor${iosSummary.categoriesCount === 1 ? 'y' : 'ies'}` : ''} selected
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {APP_LIST.map(app => {
                  const isSelected = selectedApps.find(a => a.name === app.name)
                  return (
                    <button
                      key={app.name}
                      onClick={() => toggleApp(app)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20'
                          : 'bg-dark-900 border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <span className="text-xl">{app.icon}</span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-red-300' : 'text-dark-300'}`}>{app.name}</span>
                      {isSelected && <Check size={13} className="text-red-400 ml-auto flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
              {selectedApps.length > 0 && (
                <p className="text-dark-500 text-xs">{selectedApps.length} app{selectedApps.length !== 1 ? 's' : ''} will be blocked</p>
              )}
            </>
          )}
        </div>
        <div className="px-8 pb-12 pt-4">
          <ProgressDots current={step} total={TOTAL_STEPS} />
          {setupErrorPanel}
          <div className="flex gap-3 mt-6">
            <button onClick={handleBack} className="px-6 py-4 rounded-2xl bg-dark-800 text-dark-300 font-medium text-sm hover:bg-dark-700 transition-colors">Back</button>
            <button
              onClick={handleNext}
              className={`flex-1 bg-white text-dark-950 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-dark-100 transition-colors ${stepErrors.length ? 'opacity-40' : ''}`} 
            >
              Continue
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 5: Ready ──
  return (
    <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-forge-600 to-emerald-400 flex items-center justify-center mb-8 shadow-lg shadow-forge-600/20">
          <Sparkles size={40} className="text-white" />
        </div>
        <h1 className="ff-title text-3xl text-center mb-3">You're All Set,{'\n'}{name || 'User'}!</h1>
        <p className="text-dark-400 text-center text-sm mb-8 max-w-xs">
          Your app is ready. Everything you just set up will be saved and waiting for you.
        </p>

        {/* Summary */}
        <div className="w-full space-y-2 mb-4">
          <div className="bg-dark-900 rounded-xl p-3.5 border border-dark-800 flex items-center gap-3">
            <Target size={16} className="text-yellow-400" />
            <span className="text-sm text-dark-300 flex-1">
              {[primaryTask, ...secondaryTasks, ...additionalTasks].filter(t => t.trim()).length} task{[primaryTask, ...secondaryTasks, ...additionalTasks].filter(t => t.trim()).length !== 1 ? 's' : ''} created
            </span>
          </div>
          <div className="bg-dark-900 rounded-xl p-3.5 border border-dark-800 flex items-center gap-3">
            <Flame size={16} className="text-amber-400" />
            <span className="text-sm text-dark-300 flex-1">{selectedHabits.length} habit{selectedHabits.length !== 1 ? 's' : ''} to track</span>
          </div>
          <div className="bg-dark-900 rounded-xl p-3.5 border border-dark-800 flex items-center gap-3">
            <Shield size={16} className="text-red-400" />
            <span className="text-sm text-dark-300 flex-1">
              {isIOSNative
                ? `${iosSummary.applicationsCount} app${iosSummary.applicationsCount === 1 ? '' : 's'}${iosSummary.categoriesCount > 0 ? ` + ${iosSummary.categoriesCount} categor${iosSummary.categoriesCount === 1 ? 'y' : 'ies'}` : ''} blocked`
                : `${selectedApps.length} app${selectedApps.length !== 1 ? 's' : ''} blocked`}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 mt-4">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>
      <div className="px-8 pb-12 pt-4">
        <ProgressDots current={step} total={TOTAL_STEPS} />
        <div className="flex gap-3 mt-6">
          <button onClick={handleBack} className="px-6 py-4 rounded-2xl bg-dark-800 text-dark-300 font-medium text-sm hover:bg-dark-700 transition-colors">Back</button>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Setting up...' : 'Start My Journey'}
            {!saving && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
