import { create } from 'zustand'
import { auth, db } from '../lib/supabase'
import { setActiveAccountOnNative, syncBlockedAppsToNative } from '../lib/nativeBridge'

// ── localStorage helpers ──
const STORAGE_KEYS = {
  userId: 'focusforge_user_id',
  user: 'focusforge_user',
  tasks: 'focusforge_tasks',
  habits: 'focusforge_habits',
  blockedApps: 'focusforge_blocked_apps',
  lastReset: 'focusforge_last_reset_date',
  hasAccount: 'focusforge_has_account',
  pendingEmailConfirmation: 'focusforge_pending_email_confirmation',
  strictMode: 'focusforge_strict_mode',
  accessDelay: 'focusforge_access_delay',
  focusPasses: 'focusforge_focus_passes',
  snoozeCooldown: 'focusforge_snooze_cooldown',
  focusTimer: 'focusforge_focus_timer',
  distractionAttempts: 'focusforge_distraction_attempts',
  dailyStats: 'focusforge_daily_stats',
  proceedsUsed: 'focusforge_proceeds_used',
}

// Local-date key (YYYY-MM-DD) — lexically sortable, so pruning is a string compare
const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const loadLocal = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
const saveLocal = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}
const currentUserId = () => localStorage.getItem(STORAGE_KEYS.userId)
const accountKey = (key, userId = currentUserId()) => `${key}:${userId || 'guest'}`

const ACCOUNT_STORAGE_KEYS = [
  STORAGE_KEYS.user,
  STORAGE_KEYS.tasks,
  STORAGE_KEYS.habits,
  STORAGE_KEYS.blockedApps,
  STORAGE_KEYS.lastReset,
  STORAGE_KEYS.strictMode,
  STORAGE_KEYS.accessDelay,
  STORAGE_KEYS.focusPasses,
  STORAGE_KEYS.snoozeCooldown,
  STORAGE_KEYS.focusTimer,
  STORAGE_KEYS.distractionAttempts,
  STORAGE_KEYS.dailyStats,
  STORAGE_KEYS.proceedsUsed,
]

// Move the old single-account cache into the currently signed-in user's
// namespace once. If nobody is signed in during the upgrade, the unscoped
// cache cannot be attributed safely, so it is not allowed to leak into the
// next account that signs in.
const ACCOUNT_STORAGE_MIGRATED_KEY = 'focusforge_account_storage_migrated_v1'
const migrateAccountStorage = () => {
  if (localStorage.getItem(ACCOUNT_STORAGE_MIGRATED_KEY)) return
  const userId = currentUserId()
  for (const key of ACCOUNT_STORAGE_KEYS) {
    const legacyValue = localStorage.getItem(key)
    if (legacyValue === null) continue
    if (userId) {
      const scopedKey = accountKey(key, userId)
      if (localStorage.getItem(scopedKey) === null) {
        localStorage.setItem(scopedKey, legacyValue)
      }
    }
    localStorage.removeItem(key)
  }
  localStorage.setItem(ACCOUNT_STORAGE_MIGRATED_KEY, 'true')
}
migrateAccountStorage()

const saveAccountSnapshot = (userId, state) => {
  if (!userId) return
  saveLocal(accountKey(STORAGE_KEYS.user, userId), state.user)
  saveLocal(accountKey(STORAGE_KEYS.tasks, userId), state.tasks)
  saveLocal(accountKey(STORAGE_KEYS.habits, userId), state.habits)
  saveLocal(accountKey(STORAGE_KEYS.blockedApps, userId), state.blockedApps)
  saveLocal(accountKey(STORAGE_KEYS.strictMode, userId), state.strictMode)
  saveLocal(accountKey(STORAGE_KEYS.accessDelay, userId), state.accessDelaySeconds)
  saveLocal(accountKey(STORAGE_KEYS.focusPasses, userId), state.focusPasses)
  saveLocal(accountKey(STORAGE_KEYS.snoozeCooldown, userId), state.snoozeCooldownUntil)
  saveLocal(accountKey(STORAGE_KEYS.distractionAttempts, userId), state.distractionAttempts)
  saveLocal(accountKey(STORAGE_KEYS.dailyStats, userId), state.dailyStats)
  saveLocal(accountKey(STORAGE_KEYS.proceedsUsed, userId), state.proceedsUsedToday)
  const focusTimerKey = accountKey(STORAGE_KEYS.focusTimer, userId)
  if (state.activeFocusTimer) {
    saveLocal(focusTimerKey, state.activeFocusTimer)
  } else {
    localStorage.removeItem(focusTimerKey)
  }
}

export const clearAccountStorage = (userId = currentUserId()) => {
  if (!userId) return
  for (const key of ACCOUNT_STORAGE_KEYS) {
    localStorage.removeItem(accountKey(key, userId))
  }
}

// Helper: save current state to localStorage after every mutation
const persist = (get) => saveAccountSnapshot(get().userId, get())

// How long a snooze grants access to the blocked app. 15 minutes matches
// Apple's minimum DeviceActivitySchedule interval, so the iOS shield reliably
// reapplies itself in the background when the window ends.
export const SNOOZE_MINUTES = 15

// After a snooze window ends and the app is blocked again, snoozing stays
// locked for this long. Stops back-to-back snoozes from turning earned passes
// into one long uninterrupted scroll.
export const SNOOZE_COOLDOWN_MINUTES = 30

// "Continue anyway" is the last-resort escape hatch out of the block screen.
// Capping it per day keeps it from quietly becoming the default way in.
export const MAX_PROCEEDS_PER_DAY = 3

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Read BEFORE the store is created so the very first render already knows
// whether to show the block screen. The native shield notification launches
// the WebView with `?blocked=1` baked into the initial URL — checking it in
// a useEffect (i.e. after first paint) would still flash the dashboard for
// one frame while React commits the initial state and then flips it.
const getInitialBlockedApp = () => {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('blocked') || null
  } catch {
    return null
  }
}
let initialBlockedApp = getInitialBlockedApp()

// ── Daily stats history ──
// One record per local date, so every chart on the Dashboard and Analytics
// page is backed by real measurements instead of hardcoded sample data.
// Kept for 90 days (enough for the month view) so it can't grow unbounded.
const DAILY_STATS_RETENTION_DAYS = 90

const emptyDay = () => ({
  distractions: 0,
  tasksCompleted: 0,
  habitsCompleted: 0,
  focusMinutes: 0,
})

const pruneDailyStats = (stats) => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - DAILY_STATS_RETENTION_DAYS)
  const cutoffKey = dateKey(cutoff)
  for (const key of Object.keys(stats)) {
    if (key < cutoffKey) delete stats[key]
  }
  return stats
}

// Applies `mutate` to today's record and persists. Returns the new map so
// callers can push it straight into zustand state.
const updateDailyStats = (mutate, userId = currentUserId()) => {
  const stats = pruneDailyStats(loadLocal(accountKey(STORAGE_KEYS.dailyStats, userId), {}))
  const today = dateKey()
  const day = { ...emptyDay(), ...(stats[today] || {}) }
  mutate(day)
  const next = { ...stats, [today]: day }
  saveLocal(accountKey(STORAGE_KEYS.dailyStats, userId), next)
  return next
}

// Every real block event increments this immediately, including the very
// first one on a cold start into the block screen — which happens here,
// before the store exists to dispatch an action, since `showBlockScreen`
// below is already true on that first render.
const loadDistractionAttempts = (userId = currentUserId()) => {
  let count = loadLocal(accountKey(STORAGE_KEYS.distractionAttempts, userId), 0)
  if (initialBlockedApp) {
    count += 1
    saveLocal(accountKey(STORAGE_KEYS.distractionAttempts, userId), count)
    updateDailyStats(d => { d.distractions += 1 }, userId)
  }
  return count
}
loadDistractionAttempts()

// Restore a focus timer that was started before the last page load, dropping it
// if its window already elapsed while the app was closed.
const loadFocusTimer = (userId = currentUserId()) => {
  const timer = loadLocal(accountKey(STORAGE_KEYS.focusTimer, userId), null)
  if (!timer?.startedAt || !timer?.duration) return { timer: null, remaining: 0 }
  const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000)
  const remaining = (timer.duration * 60) - elapsed
  if (remaining <= 0) {
    localStorage.removeItem(accountKey(STORAGE_KEYS.focusTimer, userId))
    return { timer: null, remaining: 0 }
  }
  return { timer, remaining }
}

const emptyAccountState = {
  user: { name: '', intention: '', streak: 0, longestStreak: 0 },
  tasks: [],
  habits: [],
  blockedApps: [],
  strictMode: false,
  accessDelaySeconds: 30,
  focusPasses: 0,
  proceedsUsedToday: 0,
  snoozeCooldownUntil: 0,
  distractionAttempts: 0,
  dailyStats: {},
  activeFocusTimer: null,
  focusTimeRemaining: 0,
}

const loadAccountSnapshot = (userId = currentUserId()) => {
  const { timer, remaining } = loadFocusTimer(userId)
  return {
    user: loadLocal(accountKey(STORAGE_KEYS.user, userId), emptyAccountState.user),
    tasks: loadLocal(accountKey(STORAGE_KEYS.tasks, userId), []),
    habits: loadLocal(accountKey(STORAGE_KEYS.habits, userId), []),
    blockedApps: loadLocal(accountKey(STORAGE_KEYS.blockedApps, userId), []),
    strictMode: loadLocal(accountKey(STORAGE_KEYS.strictMode, userId), false),
    accessDelaySeconds: loadLocal(accountKey(STORAGE_KEYS.accessDelay, userId), 30),
    focusPasses: loadLocal(accountKey(STORAGE_KEYS.focusPasses, userId), 0),
    proceedsUsedToday: loadLocal(accountKey(STORAGE_KEYS.proceedsUsed, userId), 0),
    snoozeCooldownUntil: loadLocal(accountKey(STORAGE_KEYS.snoozeCooldown, userId), 0),
    distractionAttempts: loadLocal(accountKey(STORAGE_KEYS.distractionAttempts, userId), 0),
    dailyStats: loadLocal(accountKey(STORAGE_KEYS.dailyStats, userId), {}),
    activeFocusTimer: timer,
    focusTimeRemaining: remaining,
  }
}
const initialAccount = loadAccountSnapshot(currentUserId())

const defaultFocusSessions = [
  { id: '1', name: 'Work Hours', type: 'work', startTime: '09:00', endTime: '17:00', days: [1,2,3,4,5], active: true, strict: false },
  { id: '2', name: 'Study Time', type: 'study', startTime: '19:00', endTime: '21:00', days: [1,2,3,4,5,6], active: true, strict: false },
  { id: '3', name: 'Morning Routine', type: 'morning', startTime: '06:00', endTime: '08:00', days: [0,1,2,3,4,5,6], active: true, strict: true },
  { id: '4', name: 'Bedtime Mode', type: 'bedtime', startTime: '22:00', endTime: '06:00', days: [0,1,2,3,4,5,6], active: false, strict: false },
]

const useStore = create((set, get) => ({
  // User
  user: initialAccount.user,
  userId: currentUserId() || null,

  // The intention is shown on the block screen, so it has to be changeable
  // without redoing onboarding. Saved locally first so it sticks offline, then
  // pushed to the account row when there is one.
  updateIntention: async (intention) => {
    const next = { ...get().user, intention }
    saveLocal(accountKey(STORAGE_KEYS.user), next)
    set({ user: next })

    const userId = get().userId
    if (!userId) return
    try {
      await db.updateUser(userId, { intention })
    } catch (e) {
      // Local copy is already saved; a failed sync shouldn't lose the edit.
      console.error('Failed to sync intention', e)
    }
  },

  updateName: async (name) => {
    const next = { ...get().user, name }
    saveLocal(accountKey(STORAGE_KEYS.user), next)
    set({ user: next })

    const userId = get().userId
    if (!userId) return
    try {
      await db.updateUser(userId, { name })
    } catch (e) {
      console.error('Failed to sync name', e)
    }
  },

  // Loading state
  isLoading: false,

  // Settings
  strictMode: initialAccount.strictMode,
  toggleStrictMode: () => {
    set((state) => ({ strictMode: !state.strictMode }))
    persist(get)
  },

  // How long the block screen makes you wait before it will let you through to
  // the blocked app. Persisted so the block screen — which is a separate entry
  // point that gets cold-launched by the iOS shield — reads the same value.
  accessDelaySeconds: initialAccount.accessDelaySeconds,
  setAccessDelaySeconds: (seconds) => {
    set({ accessDelaySeconds: seconds })
    persist(get)
  },

  // Strict mode "passes". Completing a task earns one pass; snoozing or
  // proceeding to a blocked app spends one. Persisted (not component state) so
  // it survives the block screen remounting, deep links and cold app launches.
  focusPasses: initialAccount.focusPasses,
  consumeFocusPass: () => {
    set((state) => ({ focusPasses: Math.max(0, state.focusPasses - 1) }))
    persist(get)
  },

  // How many times "Continue anyway" has been used today, capped at
  // MAX_PROCEEDS_PER_DAY and cleared by checkDailyReset. Persisted separately
  // from focusPasses because the block screen is cold-launched by the iOS
  // shield, so in-memory counters would reset on every attempt.
  proceedsUsedToday: initialAccount.proceedsUsedToday,

  // Spends one of today's allowance. Returns false when it's already used up,
  // so callers can bail out instead of granting access.
  consumeProceed: () => {
    const used = get().proceedsUsedToday
    if (used >= MAX_PROCEEDS_PER_DAY) return false
    const next = used + 1
    saveLocal(accountKey(STORAGE_KEYS.proceedsUsed), next)
    set({ proceedsUsedToday: next })
    return true
  },

  // Wall-clock time (ms) at which snoozing becomes available again. Stored as
  // an absolute timestamp rather than a remaining duration so it keeps ticking
  // down while the app is closed — the whole point is that the user leaves to
  // use the blocked app, and the block screen is cold-launched each time.
  snoozeCooldownUntil: initialAccount.snoozeCooldownUntil,

  // Spends one earned pass and locks snoozing until the access window has run
  // out AND the cooldown after it has elapsed.
  startSnooze: () => {
    const windowEndsAt = Date.now() + SNOOZE_MINUTES * 60_000
    set((state) => ({
      focusPasses: Math.max(0, state.focusPasses - 1),
      snoozeCooldownUntil: windowEndsAt + SNOOZE_COOLDOWN_MINUTES * 60_000,
    }))
    persist(get)
  },

  // Onboarding
  hasOnboarded: !!localStorage.getItem(STORAGE_KEYS.userId)
    && localStorage.getItem(STORAGE_KEYS.pendingEmailConfirmation) !== localStorage.getItem(STORAGE_KEYS.userId),
  awaitingEmailConfirmation: false,

  // Complete onboarding — signup with Supabase Auth, save data locally
  completeOnboarding: async ({ email, password, name, intention, tasks, habits, blockedApps }) => {
    try {
      set({ isLoading: true })

      // 1. Sign up user with Supabase Auth only
      const { user, needsEmailConfirmation } = await auth.signUp(email, password, name, intention)
      const userId = user.id

      if (needsEmailConfirmation) localStorage.setItem(STORAGE_KEYS.pendingEmailConfirmation, userId)
      else localStorage.removeItem(STORAGE_KEYS.pendingEmailConfirmation)

      // 2. Build local data
      const savedTasks = tasks.map(t => ({
        id: genId(),
        title: t.title,
        taskType: t.taskType,
        completed: false,
        date: new Date().toDateString(),
      }))

      const savedHabits = habits.map(h => ({
        id: genId(),
        title: h.title,
        icon: h.icon,
        color: h.color,
        completed: false,
      }))

      const savedApps = blockedApps.map(a => ({
        id: genId(),
        name: a.name,
        icon: a.icon,
        package: a.package,
        active: true,
        attempts: 0,
      }))

      const userData = {
        name,
        email,
        intention,
        streak: 0,
        longestStreak: 0,
        subscriptionStatus: 'trial',
        trialEndDate: user.trial_end_date,
      }

      // 3. Save everything to this account's local namespace
      localStorage.setItem(STORAGE_KEYS.userId, userId)
      localStorage.setItem(STORAGE_KEYS.hasAccount, 'true')
      await setActiveAccountOnNative(userId)
      const accountState = {
        ...emptyAccountState,
        user: userData,
        tasks: savedTasks,
        habits: savedHabits,
        blockedApps: savedApps,
      }
      saveAccountSnapshot(userId, accountState)
      saveLocal(accountKey(STORAGE_KEYS.lastReset, userId), new Date().toDateString())

      // 4. If email confirmation is needed, don't mark as onboarded yet
      if (needsEmailConfirmation) {
        set({ isLoading: false, awaitingEmailConfirmation: true })
        return { needsEmailConfirmation: true, email }
      }

      // 5. No confirmation needed — go straight to the app
      set({
        ...accountState,
        userId,
        hasOnboarded: true,
        isLoading: false,
        currentTab: 'dashboard',
      })

      // Sync blocked apps to native module
      syncBlockedAppsToNative(get().blockedApps)
      return { needsEmailConfirmation: false }
    } catch (error) {
      console.error('Onboarding error:', error)
      set({ isLoading: false })
      throw error
    }
  },

  // Sign in existing user — authenticate with Supabase, load data from localStorage
  signIn: async (email, password, { background = false } = {}) => {
    try {
      if (!background) set({ isLoading: true })

      // Authenticate with Supabase
      const { user } = await auth.signIn(email, password)
      const userId = user.id

      localStorage.setItem(STORAGE_KEYS.userId, userId)
      localStorage.setItem(STORAGE_KEYS.hasAccount, 'true')
      await setActiveAccountOnNative(userId)

      // Load this account's device cache (instant, offline) and replace the
      // previous account's in-memory state completely.
      const accountState = loadAccountSnapshot(userId)
      const savedUser = accountState.user || {}
      const userData = {
        ...savedUser,
        name: savedUser.name || user.name || '',
        email: user.email || email,
        intention: savedUser.intention || user.intention || '',
        streak: savedUser.streak || 0,
        longestStreak: savedUser.longestStreak || 0,
        subscriptionStatus: savedUser.subscriptionStatus || user.subscription_status,
        trialEndDate: savedUser.trialEndDate || user.trial_end_date,
      }
      const nextAccountState = { ...accountState, user: userData }
      saveAccountSnapshot(userId, nextAccountState)
      localStorage.removeItem(STORAGE_KEYS.pendingEmailConfirmation)

      set({
        ...nextAccountState,
        userId,
        hasOnboarded: true,
        awaitingEmailConfirmation: false,
        isLoading: false,
        currentTab: 'dashboard',
      })

      // Sync blocked apps to native module
      syncBlockedAppsToNative(get().blockedApps)
    } catch (error) {
      if (!background) {
        console.error('Sign in error:', error)
        set({ isLoading: false })
      }
      throw error
    }
  },

  // Check if a new day has started and reset daily progress.
  // Runs on every app mount regardless of login state so offline / iPad users
  // always get a fresh day.
  checkDailyReset: () => {
    const today = new Date().toDateString()
    const lastResetKey = accountKey(STORAGE_KEYS.lastReset)
    const lastResetDate = localStorage.getItem(lastResetKey)
    const isNewDay = lastResetDate !== today

    if (isNewDay) {
      localStorage.setItem(lastResetKey, today)
      let tasks = loadLocal(accountKey(STORAGE_KEYS.tasks), [])
      let habits = loadLocal(accountKey(STORAGE_KEYS.habits), [])
      let blockedApps = loadLocal(accountKey(STORAGE_KEYS.blockedApps), [])

      tasks = tasks.map(t => ({ ...t, completed: false, date: today }))
      habits = habits.map(h => ({ ...h, completed: false }))
      blockedApps = blockedApps.map(a => ({ ...a, attempts: 0 }))

      saveLocal(accountKey(STORAGE_KEYS.tasks), tasks)
      saveLocal(accountKey(STORAGE_KEYS.habits), habits)
      saveLocal(accountKey(STORAGE_KEYS.blockedApps), blockedApps)
      saveLocal(accountKey(STORAGE_KEYS.focusPasses), 0)
      saveLocal(accountKey(STORAGE_KEYS.distractionAttempts), 0)
      saveLocal(accountKey(STORAGE_KEYS.proceedsUsed), 0)

      // Update zustand state directly so UI reflects reset immediately
      set({ tasks, habits, blockedApps, focusPasses: 0, distractionAttempts: 0, proceedsUsedToday: 0 })
    }
  },

  // Load user data from localStorage on app start (instant, no network needed)
  loadUserData: async () => {
    const userId = localStorage.getItem(STORAGE_KEYS.userId)
    if (!userId) return

    try {
      set({ isLoading: true })
      await setActiveAccountOnNative(userId, { allowLegacyMigration: true })

      const accountState = loadAccountSnapshot(userId)

      set({
        ...accountState,
        userId,
        isLoading: false,
      })

      // Sync blocked apps to native module
      syncBlockedAppsToNative(get().blockedApps)
    } catch (error) {
      console.error('Load data error:', error)
      set({ isLoading: false })
    }
  },

  // Tasks
  tasks: initialAccount.tasks,
  addTask: (task) => {
    const newTask = { id: genId(), title: task.title, taskType: task.taskType, completed: false, date: new Date().toDateString() }
    set((state) => ({ tasks: [...state.tasks, newTask] }))
    persist(get)
  },
  toggleTask: (id) => {
    set((state) => {
      const task = state.tasks.find(t => t.id === id)
      if (!task) return {}
      const nowCompleted = !task.completed
      return {
        tasks: state.tasks.map(t => t.id === id ? { ...t, completed: nowCompleted } : t),
        // Completing a task earns a pass; un-checking it gives the pass back so
        // passes can't be farmed by toggling the same task on and off.
        focusPasses: nowCompleted
          ? state.focusPasses + 1
          : Math.max(0, state.focusPasses - 1),
      }
    })
    persist(get)
    get().recordTaskProgress()
  },
  deleteTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) }))
    persist(get)
  },

  // Habits
  habits: initialAccount.habits,
  addHabit: (habit) => {
    const newHabit = { id: genId(), title: habit.title, icon: habit.icon, color: habit.color, completed: false }
    set((state) => ({ habits: [...state.habits, newHabit] }))
    persist(get)
  },
  toggleHabit: (id) => {
    set((state) => ({ habits: state.habits.map(h => h.id === id ? { ...h, completed: !h.completed } : h) }))
    persist(get)
    get().recordHabitProgress()
  },
  deleteHabit: (id) => {
    set((state) => ({ habits: state.habits.filter(h => h.id !== id) }))
    persist(get)
  },

  // Blocked Apps
  blockedApps: initialAccount.blockedApps,
  addBlockedApp: (appData) => {
    const newApp = {
      id: genId(),
      name: appData.name,
      icon: appData.icon,
      package: appData.package,
      active: true,
      attempts: 0,
    }
    set((state) => ({ blockedApps: [...state.blockedApps, newApp] }))
    persist(get)
    syncBlockedAppsToNative(get().blockedApps)
  },
  toggleBlockedApp: (id) => {
    set((state) => ({ blockedApps: state.blockedApps.map(a => a.id === id ? { ...a, active: !a.active } : a) }))
    persist(get)
    syncBlockedAppsToNative(get().blockedApps)
  },
  addDistractionAttempt: (appId) => {
    set((state) => ({ blockedApps: state.blockedApps.map(a => a.id === appId ? { ...a, attempts: a.attempts + 1 } : a) }))
    persist(get)
  },

  // Focus Sessions
  focusSessions: defaultFocusSessions,
  // Persisted, because the timer has to survive a page load: starting a focus
  // session from the standalone block screen then hands off to the full app.
  // `startedAt` is a wall-clock stamp, so the remaining time is always derived
  // rather than counted down in memory.
  activeFocusTimer: initialAccount.activeFocusTimer,
  focusTimeRemaining: initialAccount.focusTimeRemaining,
  startFocusTimer: (minutes) => {
    const timer = { startedAt: Date.now(), duration: minutes }
    saveLocal(accountKey(STORAGE_KEYS.focusTimer), timer)
    set({ activeFocusTimer: timer, focusTimeRemaining: minutes * 60 })
  },
  // Credits only the time actually spent focusing, so stopping early doesn't
  // bank the full session length.
  stopFocusTimer: () => {
    const timer = get().activeFocusTimer
    if (timer) {
      const elapsedMin = Math.floor((Date.now() - timer.startedAt) / 60000)
      get().recordFocusMinutes(Math.min(elapsedMin, timer.duration))
    }
    localStorage.removeItem(accountKey(STORAGE_KEYS.focusTimer))
    set({ activeFocusTimer: null, focusTimeRemaining: 0 })
  },
  tickTimer: () => {
    const state = get()
    if (!state.activeFocusTimer) return
    const elapsed = Math.floor((Date.now() - state.activeFocusTimer.startedAt) / 1000)
    const remaining = (state.activeFocusTimer.duration * 60) - elapsed
    if (remaining <= 0) {
      // Ran to completion — credit the full planned duration.
      const earned = state.activeFocusTimer.duration
      localStorage.removeItem(accountKey(STORAGE_KEYS.focusTimer))
      set({ activeFocusTimer: null, focusTimeRemaining: 0 })
      get().recordFocusMinutes(earned)
      return
    }
    set({ focusTimeRemaining: remaining })
  },

  // Analytics — real per-day history, keyed by YYYY-MM-DD.
  dailyStats: initialAccount.dailyStats,
  // Task/habit counts are snapshots of "how many were done today", so they're
  // rewritten (not incremented) whenever the user checks or unchecks one.
  recordTaskProgress: () => {
    const done = get().tasks.filter(t => t.completed).length
    set({ dailyStats: updateDailyStats(d => { d.tasksCompleted = done }) })
  },
  recordHabitProgress: () => {
    const done = get().habits.filter(h => h.completed).length
    set({ dailyStats: updateDailyStats(d => { d.habitsCompleted = done }) })
  },
  recordFocusMinutes: (minutes) => {
    if (!minutes || minutes <= 0) return
    set({ dailyStats: updateDailyStats(d => { d.focusMinutes += minutes }) })
  },
  // Returns the last `days` days (oldest first) as a dense series, filling
  // gaps with zeroed records so charts never have holes.
  getDailySeries: (days) => {
    const stats = get().dailyStats
    const today = new Date()
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (days - 1 - i))
      const key = dateKey(d)
      return { date: key, dateObj: d, ...emptyDay(), ...(stats[key] || {}) }
    })
  },
  // Calendar week anchored to Sunday, running through Saturday — separate from
  // getDailySeries because dashboard widgets intentionally show a trailing
  // window, while the Stats week view should line up with the actual week.
  // Days after today are included as zeroed records so the axis is complete.
  getCalendarWeekSeries: () => {
    const stats = get().dailyStats
    const sunday = new Date()
    sunday.setDate(sunday.getDate() - sunday.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      const key = dateKey(d)
      return { date: key, dateObj: d, ...emptyDay(), ...(stats[key] || {}) }
    })
  },
  getCalendarMonthSeries: () => {
    const stats = get().dailyStats
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), i + 1)
      const key = dateKey(d)
      return { date: key, dateObj: d, ...emptyDay(), ...(stats[key] || {}) }
    })
  },
  totalDistractionAttempts: () => get().blockedApps.reduce((sum, a) => sum + a.attempts, 0),
  
  // Block screen state — initialized from the URL query param (see
  // getInitialBlockedApp above) so a shield-notification launch shows the
  // block screen on the very first render, with no dashboard flash.
  showBlockScreen: !!initialBlockedApp,
  blockingApp: initialBlockedApp,
  // Apple's Screen Time API never reveals which app triggered the shield
  // (privacy), so this is a single daily total rather than per-app counts —
  // the per-app `attempts` field on blockedApps can't be attributed on iOS.
  distractionAttempts: initialAccount.distractionAttempts,
  triggerBlockScreen: (appName) => {
    // The very first attempt (cold start) is already counted above, before
    // the store existed. Every subsequent trigger — warm-start deep link,
    // re-tapping the notification while already on the block screen — is a
    // genuinely new attempt and is counted here instead.
    if (initialBlockedApp) {
      initialBlockedApp = null
    } else {
      const count = get().distractionAttempts + 1
      saveLocal(accountKey(STORAGE_KEYS.distractionAttempts), count)
      set({
        distractionAttempts: count,
        dailyStats: updateDailyStats(d => { d.distractions += 1 }),
      })
    }
    set({ showBlockScreen: true, blockingApp: appName })
  },
  dismissBlockScreen: () => set({ showBlockScreen: false, blockingApp: null }),

  // Navigation
  currentTab: 'dashboard',
  setCurrentTab: (tab) => set({ currentTab: tab }),

  // Unified daily progress — combined tasks + habits completion %, so the
  // progress bar is identical across Dashboard, Habits, and BlockScreen.
  // (Tasks page shows its own task-only progress, since that page is scoped
  // to tasks specifically.) Previously this only counted tasks, so completing
  // a habit never moved the bar on Habits or the block screen.
  getDailyProgress: () => {
    const state = get()
    const totalItems = state.tasks.length + state.habits.length
    if (totalItems === 0) return 0
    const completedItems =
      state.tasks.filter(t => t.completed).length +
      state.habits.filter(h => h.completed).length
    return Math.round((completedItems / totalItems) * 100)
  },

  // Computed (legacy combined score — kept for any future use)
  getDisciplineScore: () => {
    const state = get()
    const totalTasks = state.tasks.length || 1
    const completedTasks = state.tasks.filter(t => t.completed).length
    const totalHabits = state.habits.length || 1
    const completedHabits = state.habits.filter(h => h.completed).length
    const taskScore = (completedTasks / totalTasks) * 50
    const habitScore = (completedHabits / totalHabits) * 50
    return Math.round(taskScore + habitScore)
  },
}))

export default useStore
