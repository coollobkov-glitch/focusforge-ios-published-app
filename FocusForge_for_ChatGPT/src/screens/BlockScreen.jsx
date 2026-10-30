import React, { useState, useEffect } from 'react'
import { ArrowLeft, Check, Timer, Clock, Shield, X, ChevronDown, ChevronUp, Plus, Target, Sparkles, Pencil } from 'lucide-react'
import useStore, { SNOOZE_MINUTES, SNOOZE_COOLDOWN_MINUTES, MAX_PROCEEDS_PER_DAY } from '../store/useStore'
import quotes from '../data/quotes'
import { ForgeMark, ForgeWordmark } from './ForgeBrand'

const TIER = {
  primary: { label: 'Primary', badge: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
  secondary: { label: 'Secondary', badge: 'bg-forge-500/10 border-forge-500/30 text-forge-400' },
  additional: { label: 'Additional', badge: 'bg-dark-700/50 border-dark-600 text-dark-400' },
}

const QUICK_HABITS = [
  { title: 'Morning Workout', icon: '💪' },
  { title: 'Read 20 Pages', icon: '📚' },
  { title: 'Meditate', icon: '🧘' },
  { title: 'Journal', icon: '✍️' },
  { title: 'Drink Water', icon: '💧' },
  { title: 'Walk Outside', icon: '🚶' },
]

export default function BlockScreen() {
  const {
    blockingApp, dismissBlockScreen, tasks, habits, blockedApps,
    toggleTask, toggleHabit, getDailyProgress, startFocusTimer,
    setCurrentTab, user, addTask, addHabit, strictMode,
    focusPasses, consumeFocusPass, distractionAttempts, accessDelaySeconds,
    snoozeCooldownUntil, startSnooze, proceedsUsedToday, consumeProceed
  } = useStore()

  // "Continue anyway" is capped per day — once it's spent, the block screen has
  // no escape hatch left until tomorrow.
  const proceedsLeft = Math.max(0, MAX_PROCEEDS_PER_DAY - proceedsUsedToday)
  const hasProceedsLeft = proceedsLeft > 0

  // Seeded from the persisted "Delay Before Access" setting. The store reads
  // localStorage synchronously at creation, so this is already the real value
  // on first render even when the iOS shield cold-launches this screen.
  const [countdown, setCountdown] = useState(accessDelaySeconds)
  const [canProceed, setCanProceed] = useState(false)
  const [accessBusy, setAccessBusy] = useState(false)
  const [accessMessage, setAccessMessage] = useState('')
  const [showTasks, setShowTasks] = useState(true)
  const [showHabits, setShowHabits] = useState(true)
  const [quote] = useState(quotes[Math.floor(Math.random() * quotes.length)])
  
  // Goal setting state
  const [isSettingGoals, setIsSettingGoals] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskType, setNewTaskType] = useState('primary')
  const [selectedHabits, setSelectedHabits] = useState([])
  
  // Check if user has set goals for today
  const today = new Date().toDateString()
  const todaysTasks = tasks.filter(t => t.date === today)
  const hasGoalsForToday = todaysTasks.length > 0 || habits.length > 0

  // Strict mode: you need a "pass" to get into a blocked app. Completing a task
  // earns one pass, snoozing/proceeding spends one. Passes live in the store
  // (persisted to localStorage) rather than in component state, because this
  // screen is remounted every time the iOS shield deep-links back into the app
  // — component state would be wiped between earning and spending a pass.
  const isBlockedByStrict = strictMode && focusPasses < 1

  // Snoozing is earned and rate limited:
  //  1. Each completed task banks one pass, and each snooze spends one, so
  //     three finished tasks buy three snoozes.
  //  2. After a snooze, the button stays locked until that window has expired
  //     AND the cooldown after it has passed — so you can't chain snoozes back
  //     to back the moment the app blocks again.
  const [nowMs, setNowMs] = useState(() => Date.now())
  const cooldownRemainingMs = Math.max(0, snoozeCooldownUntil - nowMs)
  const isCoolingDown = cooldownRemainingMs > 0
  const hasPass = focusPasses > 0
  const canSnooze = canProceed && (!strictMode || hasPass) && !isCoolingDown && !accessBusy

  const formatCooldown = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
  }

  const snoozeLabel = !canProceed
    ? isBlockedByStrict && countdown <= 0 ? 'Complete a task to earn a snooze' : `Snooze available in ${countdown}s`
    : isCoolingDown
      ? `Snooze locked for ${formatCooldown(cooldownRemainingMs)}`
      : strictMode && !hasPass
        ? 'Complete a task to earn a snooze'
        : strictMode ? `Snooze for ${SNOOZE_MINUTES} min (${focusPasses} left)` : `Snooze for ${SNOOZE_MINUTES} min`

  // Tell native this screen is on screen so it can drop the cover that hides
  // the previously-viewed tab. Double rAF waits for an actual paint — firing
  // on mount alone would reveal the WebView a frame before this is drawn.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.FocusForgeNative?.blockScreenReady) return
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.FocusForgeNative.blockScreenReady().catch(() => {})
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (countdown <= 0) {
      setCanProceed(!isBlockedByStrict)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, isBlockedByStrict])

  // If the delay is changed in Settings while this screen is mounted (web/dev),
  // restart the wait rather than keeping the stale countdown.
  useEffect(() => {
    setCountdown(accessDelaySeconds)
    setCanProceed(false)
  }, [accessDelaySeconds])

  // Re-render once a second while a cooldown is active so the remaining time
  // counts down, then stop so an idle block screen isn't ticking forever.
  useEffect(() => {
    if (snoozeCooldownUntil <= Date.now()) return
    const id = setInterval(() => {
      const t = Date.now()
      setNowMs(t)
      if (t >= snoozeCooldownUntil) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [snoozeCooldownUntil])

  // Auto-show goal setting if no goals for today
  useEffect(() => {
    if (!hasGoalsForToday) {
      setIsSettingGoals(true)
    }
  }, [hasGoalsForToday])

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    addTask({ title: newTaskTitle.trim(), taskType: newTaskType })
    setNewTaskTitle('')
  }

  const handleToggleQuickHabit = (habit) => {
    const exists = selectedHabits.find(h => h.title === habit.title)
    if (exists) {
      setSelectedHabits(selectedHabits.filter(h => h.title !== habit.title))
    } else {
      setSelectedHabits([...selectedHabits, habit])
    }
  }

  const handleSaveGoals = async () => {
    // Add selected habits
    for (const habit of selectedHabits) {
      await addHabit({ title: habit.title, icon: habit.icon, color: 'forge' })
    }
    setSelectedHabits([])
    setIsSettingGoals(false)
  }

  const completedTasks = tasks.filter(t => t.completed)
  const incompleteTasks = tasks.filter(t => !t.completed)
  const completedHabits = habits.filter(h => h.completed)
  const incompleteHabits = habits.filter(h => !h.completed)
  const dailyProgress = getDailyProgress()
  const totalAttempts = blockedApps.reduce((sum, a) => sum + a.attempts, 0)

  const topApps = [...blockedApps]
    .filter(a => a.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 4)

  // Native block-overlay bridge detection. When this WebView is loaded inside the
  // Android BlockOverlayActivity, `window.BlockBridge` is injected. In that case,
  // the ONLY way to access the blocked app is to wait the 30s timer and click
  // proceed (or snooze, also gated by the timer). Every other action just sends
  // the user back to the home screen without granting access.
  const hasNativeBridge = typeof window !== 'undefined' && !!window.BlockBridge
  const hasIOSBridge = typeof window !== 'undefined' && window.FocusForgeNative && window.FocusForgeNative.platform === 'ios'

  const nativeProceed = async (durationMs) => {
    if (hasIOSBridge) {
      // iOS: a single native call lifts the Screen Time shield for the given
      // duration AND launches the target app once the OS has actually dropped
      // the shield. Apple's Screen Time API never reveals which app was
      // shielded (privacy), so only launch an app when we know its identity.
      // Orchestrating this from JS does not work: the WebView's timers get
      // throttled, so the app launch would beat the shield removal and
      // re-trigger it instantly.
      const minutes = Math.max(1, Math.round(durationMs / 60000))
      const scheme = blockingApp === 'Instagram' ? 'instagram://' : ''
      const result = await window.FocusForgeNative.snooze(minutes, scheme)
      if (!result?.success || !result?.unblocked) throw new Error(result?.error || 'Could not grant access. Try again.')
      if (!result.opened) setAccessMessage(`Access granted for ${minutes} minute${minutes === 1 ? '' : 's'}. Return to the app you tried to open.`)
      return result.opened
    }
    window.BlockBridge.proceed(durationMs)
  }
  const nativeGoHome = () => {
    if (hasIOSBridge) {
      dismissBlockScreen()
      return
    }
    try { window.BlockBridge.goHome() } catch (e) { console.error(e) }
  }

  // "Return to Focus" / "Edit Goals" — don't grant access, just leave
  const handleGoBack = () => {
    if (hasNativeBridge || hasIOSBridge) { nativeGoHome(); return }
    dismissBlockScreen()
  }

  const handleStartFocus = () => {
    startFocusTimer(25)
    if (hasNativeBridge || hasIOSBridge) { nativeGoHome(); return }
    dismissBlockScreen()
    setCurrentTab('focus')
  }

  // Snooze — needs the access delay to have elapsed, an earned pass, and no
  // active cooldown. Grants SNOOZE_MINUTES of access to the blocked app, then
  // locks snoozing for the cooldown period once that window ends.
  const handleSnooze = async () => {
    if (!canSnooze) return
    setAccessBusy(true)
    setAccessMessage('')
    try {
      const opened = hasNativeBridge || hasIOSBridge ? await nativeProceed(SNOOZE_MINUTES * 60 * 1000) : false
      startSnooze()
      if (opened || (!hasNativeBridge && !hasIOSBridge)) dismissBlockScreen()
    } catch (error) {
      setAccessMessage(error.message || 'Could not grant access. Try again.')
    } finally {
      setAccessBusy(false)
    }
  }

  // "Continue anyway" — only available after timer. Grants 60 seconds of access.
  const handleProceed = async () => {
    if (!canProceed || !hasProceedsLeft || accessBusy) return
    setAccessBusy(true)
    setAccessMessage('')
    try {
      const opened = hasNativeBridge || hasIOSBridge ? await nativeProceed(60 * 1000) : false
      // Only spend an allowance after the native grant succeeds.
      if (!consumeProceed()) return
      if (strictMode) consumeFocusPass()
      if (opened || (!hasNativeBridge && !hasIOSBridge)) dismissBlockScreen()
    } catch (error) {
      setAccessMessage(error.message || 'Could not grant access. Try again.')
    } finally {
      setAccessBusy(false)
    }
  }

  const handleEditGoals = () => {
    if (hasNativeBridge || hasIOSBridge) { nativeGoHome(); return }
    dismissBlockScreen()
    setCurrentTab('tasks')
  }

  // Goal Setting UI
  if (isSettingGoals) {
    return (
      <div className="ff-screen ff-goal-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-forge-500/5 via-dark-950 to-dark-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-forge-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex-1 overflow-y-auto scrollbar-hide px-5 pt-10 pb-8">
          {/* Header */}
          <div className="ff-goal-header text-center mb-6">
            <div className="flex justify-center mb-4"><ForgeWordmark /></div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forge-500/10 border border-forge-500/20 mb-4">
              <Target size={14} className="text-forge-400" />
              <span className="text-forge-300 text-xs font-semibold tracking-wider">SET YOUR DAILY TARGETS</span>
            </div>
            <h1 className="ff-title ff-goal-title text-2xl mb-1">Discipline starts with a target.</h1>
            <p className="text-dark-400 text-sm">
              Set today's priorities before returning to {blockingApp || 'the blocked app'}.
            </p>
          </div>

          {/* Motivational Quote */}
          <div className="ff-goal-quote bg-dark-900/80 backdrop-blur-sm rounded-2xl p-5 mb-5 border border-dark-700/50 text-center">
            <p className="text-base font-medium text-dark-200 leading-relaxed italic">
              "{quote}"
            </p>
          </div>

          {/* Add Task Section */}
          <div className="ff-goal-panel ff-task-panel bg-dark-900 rounded-2xl p-4 mb-4 border border-dark-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-forge-400" />
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Add Today's Tasks</span>
            </div>
            
            {/* Task Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="What do you need to accomplish?"
                className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-forge-500"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-3 bg-forge-600 text-white rounded-xl hover:bg-forge-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Task Type Selector */}
            <div className="flex gap-2 mb-3">
              {['primary', 'secondary', 'additional'].map(type => (
                <button
                  key={type}
                  onClick={() => setNewTaskType(type)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    newTaskType === type
                      ? TIER[type].badge
                      : 'bg-dark-800 border-dark-700 text-dark-500'
                  }`}
                >
                  {TIER[type].label}
                </button>
              ))}
            </div>

            {/* Today's Tasks List */}
            {todaysTasks.length > 0 && (
              <div className="space-y-1.5 mt-3 pt-3 border-t border-dark-700">
                {todaysTasks.map(task => {
                  const tier = TIER[task.taskType] || TIER.additional
                  return (
                    <div key={task.id} className="bg-dark-800 rounded-xl p-3 flex items-center gap-3">
                      <Check size={14} className="text-forge-400" />
                      <span className="text-sm text-dark-300 flex-1">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${tier.badge}`}>
                        {tier.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Habits Section */}
          <div className="ff-goal-panel ff-habit-panel bg-dark-900 rounded-2xl p-4 mb-5 border border-dark-800">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-forge-400" />
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Select Today's Habits</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {QUICK_HABITS.map(habit => {
                const isSelected = selectedHabits.find(h => h.title === habit.title)
                const alreadyExists = habits.find(h => h.title === habit.title)
                
                if (alreadyExists) {
                  return (
                    <div
                      key={habit.title}
                      className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 flex items-center gap-2"
                    >
                      <span className="text-base">{habit.icon}</span>
                      <span className="text-xs text-emerald-400 flex-1 truncate">{habit.title}</span>
                      <Check size={12} className="text-emerald-400" />
                    </div>
                  )
                }
                
                return (
                  <button
                    key={habit.title}
                    onClick={() => handleToggleQuickHabit(habit)}
                    className={`rounded-xl p-3 border flex items-center gap-2 transition-all text-left ${
                      isSelected
                        ? 'bg-forge-500/10 border-forge-500/30'
                        : 'bg-dark-800 border-dark-700 hover:border-forge-600/50'
                    }`}
                  >
                    <span className="text-base">{habit.icon}</span>
                    <span className={`text-xs flex-1 truncate ${isSelected ? 'text-forge-300' : 'text-dark-300'}`}>
                      {habit.title}
                    </span>
                    {isSelected && <Check size={12} className="text-forge-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleSaveGoals}
              disabled={todaysTasks.length === 0 && selectedHabits.length === 0 && habits.length === 0}
              className="ff-goal-primary-action w-full bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-forge-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={18} />
              {todaysTasks.length === 0 && selectedHabits.length === 0 && habits.length === 0
                ? 'Add at least one task or habit'
                : 'Save Goals & Continue'
              }
            </button>

            {hasGoalsForToday && (
              <button
                onClick={() => setIsSettingGoals(false)}
                className="w-full bg-dark-900 border border-dark-700 text-dark-300 font-medium py-3 rounded-2xl hover:border-dark-600 transition-colors"
              >
                Back to Block Screen
              </button>
            )}

            {/* Snooze — needs an earned pass and no active cooldown */}
            <button
              onClick={handleSnooze}
              disabled={!canSnooze}
              className={`w-full border font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm ${
                canSnooze
                  ? 'bg-dark-900/50 border-dark-800 text-dark-400 hover:border-dark-600'
                  : 'bg-dark-900/30 border-dark-800/50 text-dark-700 cursor-not-allowed'
              }`}
            >
              <Clock size={14} />
              {snoozeLabel}
            </button>

            {accessMessage && <p role="status" className="text-center text-xs text-forge-300">{accessMessage}</p>}
            {/* Proceed with delay */}
            <div className="text-center pt-2">
              {!hasProceedsLeft ? (
                <p className="text-red-400 text-xs font-medium">
                  You've used all {MAX_PROCEEDS_PER_DAY} of today's passes into {blockingApp}. Blocked until tomorrow.
                </p>
              ) : isBlockedByStrict ? (
                <p className="text-red-400 text-xs font-medium">
                  Strict mode: complete a task to earn a pass into {blockingApp}
                </p>
              ) : canProceed ? (
                <button
                  onClick={handleProceed}
                  className="text-forge-300 text-sm font-medium py-2 hover:text-forge-200 transition-colors underline underline-offset-4"
                >
                  Continue to {blockingApp} anyway ({proceedsLeft} left today)
                </button>
              ) : (
                <p className="text-dark-700 text-xs">
                  Wait {countdown}s to continue to {blockingApp}...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-forge-600/10 via-dark-950 to-dark-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-forge-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex-1 overflow-y-auto scrollbar-hide px-5 pt-10 pb-8">
        {/* Discipline-first block header — approved Concept 4, no flame artwork */}
        <div className="text-center mb-6">
          <div className="ff-logo-stage">
            <ForgeMark size={82} />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forge-500/10 border border-forge-500/20 mb-5">
            <Shield size={13} className="text-forge-400" />
            <span className="ff-kicker">DISCIPLINE OVER DISTRACTION</span>
          </div>
          <h1 className="ff-block-headline">Protect<br />Your Focus</h1>
          <p className="text-dark-500 text-xs mt-2">
            You tried to open <span className="text-dark-200 font-semibold">{blockingApp || 'a blocked app'}</span>
          </p>
        </div>

        {/* Motivational Quote */}
        <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl p-5 mb-5 mt-2 border border-dark-700/50 text-center">
          <p className="text-base font-medium text-dark-200 leading-relaxed italic">
            "{quote}"
          </p>
        </div>

        {/* Your Intention */}
        <div className="bg-gradient-to-r from-forge-900/30 to-forge-900/30 rounded-2xl p-4 mb-5 border border-forge-700/20">
          <p className="text-dark-500 text-[10px] font-semibold uppercase tracking-wider mb-1">Your Intention</p>
          <p className="text-sm text-dark-200 italic">"{user.intention}"</p>
        </div>

        {/* Daily Progress */}
        <div className="bg-dark-900 rounded-2xl p-4 mb-4 border border-dark-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs font-semibold uppercase tracking-wider">Daily Progress</span>
            <span className="text-lg font-bold">{dailyProgress}%</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3 mb-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-forge-600 via-forge-400 to-success transition-all duration-700 relative"
              style={{ width: `${dailyProgress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-forge-500/50 border-2 border-forge-500" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-dark-500">
            <span>Tasks: {completedTasks.length}/{tasks.length}</span>
            <span>Habits: {completedHabits.length}/{habits.length}</span>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="mb-4">
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="flex items-center justify-between w-full mb-2"
          >
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
              Tasks ({completedTasks.length}/{tasks.length})
            </span>
            {showTasks ? <ChevronUp size={14} className="text-dark-500" /> : <ChevronDown size={14} className="text-dark-500" />}
          </button>
          {showTasks && (
            <div className="space-y-1.5">
              {incompleteTasks.map(task => {
                const tier = TIER[task.taskType] || TIER.additional
                return (
                  <div key={task.id} className="bg-dark-900 rounded-xl p-3 border border-dark-800 flex items-center gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-5 h-5 rounded-md border-2 border-dark-600 flex-shrink-0 hover:border-forge-500 transition-colors"
                    />
                    <p className="text-sm text-dark-300 flex-1">{task.title}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${tier.badge}`}>
                      {tier.label}
                    </span>
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="px-2.5 py-1 rounded-lg bg-forge-600/20 text-forge-400 text-[10px] font-semibold hover:bg-forge-600 hover:text-white transition-all"
                    >
                      Done
                    </button>
                  </div>
                )
              })}
              {completedTasks.map(task => {
                const tier = TIER[task.taskType] || TIER.additional
                return (
                  <div key={task.id} className="bg-dark-900/40 rounded-xl p-3 border border-dark-800/40 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-emerald-400" />
                    </div>
                    <p className="text-sm text-dark-600 line-through flex-1">{task.title}</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border opacity-50 ${tier.badge}`}>
                      {tier.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Habits Section */}
        <div className="mb-4">
          <button
            onClick={() => setShowHabits(!showHabits)}
            className="flex items-center justify-between w-full mb-2"
          >
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
              Habits ({completedHabits.length}/{habits.length})
            </span>
            {showHabits ? <ChevronUp size={14} className="text-dark-500" /> : <ChevronDown size={14} className="text-dark-500" />}
          </button>
          {showHabits && (
            <div className="grid grid-cols-2 gap-1.5">
              {incompleteHabits.map(habit => (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className="bg-dark-900 rounded-xl p-3 border border-dark-800 flex items-center gap-2 hover:border-forge-600/50 transition-all text-left"
                >
                  <span className="text-base">{habit.icon}</span>
                  <span className="text-xs text-dark-300 flex-1 truncate">{habit.title}</span>
                </button>
              ))}
              {completedHabits.map(habit => (
                <div
                  key={habit.id}
                  className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 flex items-center gap-2"
                >
                  <Check size={14} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-dark-500 truncate">{habit.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Distraction Stats */}
        <div className="bg-red-500/5 rounded-2xl p-4 mb-5 border border-red-500/10">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-red-400" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Distraction Attempts Today</span>
          </div>
          <p className="ff-title text-3xl text-red-400 mb-3">{distractionAttempts}</p>
          <div className="flex gap-2 flex-wrap">
            {topApps.map(app => (
              <div key={app.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900/50 border border-dark-800">
                <span className="text-sm">{app.icon}</span>
                <span className="text-[10px] text-dark-400">{app.name}</span>
                <span className="text-[10px] font-bold text-red-400">{app.attempts + (app.name === blockingApp ? 1 : 0)}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Primary: Go Back */}
          <button
            onClick={handleGoBack}
            className="w-full bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-forge-600/20"
          >
            <ArrowLeft size={18} />
            Return to Focus
          </button>

          {/* Edit Goals */}
          <button
            onClick={handleEditGoals}
            className="w-full bg-dark-900 border border-forge-600/30 text-forge-300 font-medium py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:border-forge-500 hover:bg-forge-900/20 transition-colors"
          >
            <Pencil size={16} className="text-forge-400" />
            Edit Today's Goals
          </button>

          {/* Start Focus Timer */}
          <button
            onClick={handleStartFocus}
            className="w-full bg-dark-900 border border-dark-700 text-dark-200 font-medium py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:border-dark-600 transition-colors"
          >
            <Timer size={16} className="text-forge-400" />
            Start 25-min Focus Session
          </button>

          {/* Snooze — needs an earned pass and no active cooldown */}
          <button
            onClick={handleSnooze}
            disabled={!canSnooze}
            className={`w-full border font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm ${
              canSnooze
                ? 'bg-dark-900/50 border-dark-800 text-dark-400 hover:border-dark-600'
                : 'bg-dark-900/30 border-dark-800/50 text-dark-700 cursor-not-allowed'
            }`}
          >
            <Clock size={14} />
            {snoozeLabel}
          </button>

          {isCoolingDown && (
            <p className="text-dark-600 text-[11px] text-center leading-relaxed">
              Snoozes are spaced {SNOOZE_COOLDOWN_MINUTES} minutes apart. You have{' '}
              {focusPasses} pass{focusPasses === 1 ? '' : 'es'} banked.
            </p>
          )}

          {accessMessage && <p role="status" className="text-center text-xs text-forge-300">{accessMessage}</p>}
          {/* Proceed with delay */}
          <div className="text-center pt-2">
            {!hasProceedsLeft ? (
              <p className="text-red-400 text-xs font-medium">
                You've used all {MAX_PROCEEDS_PER_DAY} of today's passes into {blockingApp}. Blocked until tomorrow.
              </p>
            ) : isBlockedByStrict ? (
              <p className="text-red-400 text-xs font-medium">
                Strict mode: complete a task to earn a pass into {blockingApp}
              </p>
            ) : canProceed ? (
              <button
                onClick={handleProceed}
                className="text-forge-300 text-sm font-medium py-2 hover:text-forge-200 transition-colors underline underline-offset-4"
              >
                Continue to {blockingApp} anyway ({proceedsLeft} left today)
              </button>
            ) : (
              <p className="text-dark-700 text-xs">
                Wait {countdown}s to continue to {blockingApp}...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
