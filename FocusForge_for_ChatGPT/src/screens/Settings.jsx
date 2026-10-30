import React, { useState } from 'react'
import { Shield, Bell, Clock, Palette, Info, ChevronRight, Lock, Unlock, Plus, Pencil, Zap, CheckCircle2 } from 'lucide-react'
import useStore, { SNOOZE_COOLDOWN_MINUTES, MAX_PROCEEDS_PER_DAY, clearAccountStorage } from '../store/useStore'
import { auth } from '../lib/supabase'
import { setActiveAccountOnNative, syncBlockedAppsToNative } from '../lib/nativeBridge'
import { ForgeWordmark } from './ForgeBrand'

const APP_VERSION = '1.0.0'

const availableApps = [
  { name: 'Instagram', icon: '📸', package: 'com.instagram.android' },
  { name: 'TikTok', icon: '🎵', package: 'com.zhiliaoapp.musically' },
  { name: 'YouTube', icon: '▶️', package: 'com.google.android.youtube' },
  { name: 'X (Twitter)', icon: '🐦', package: 'com.twitter.android' },
  { name: 'Facebook', icon: '👤', package: 'com.facebook.katana' },
  { name: 'Snapchat', icon: '👻', package: 'com.snapchat.android' },
  { name: 'Reddit', icon: '🔴', package: 'com.reddit.frontpage' },
  { name: 'Netflix', icon: '🎬', package: 'com.netflix.mediaclient' },
  { name: 'Twitch', icon: '🟣', package: 'tv.twitch.android.app' },
  { name: 'Pinterest', icon: '📌', package: 'com.pinterest' },
  { name: 'Discord', icon: '💬', package: 'com.discord' },
  { name: 'Telegram', icon: '✈️', package: 'org.telegram.messenger' },
]

export default function Settings() {
  const {
    blockedApps, toggleBlockedApp, addBlockedApp, user, strictMode, toggleStrictMode,
    accessDelaySeconds, setAccessDelaySeconds, updateName, updateIntention, dailyStats,
  } = useStore()
  const [activeSection, setActiveSection] = useState('apps')
  const [openPanel, setOpenPanel] = useState(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [isEditingIntention, setIsEditingIntention] = useState(false)
  const [intentionDraft, setIntentionDraft] = useState('')
  const [savingIntention, setSavingIntention] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState('')

  const handleSaveName = async () => {
    const next = nameDraft.trim()
    if (!next || savingName) return
    setSavingName(true)
    try {
      await updateName(next)
      setIsEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveIntention = async () => {
    const next = intentionDraft.trim()
    if (!next || savingIntention) return
    setSavingIntention(true)
    try {
      await updateIntention(next)
      setIsEditingIntention(false)
    } finally {
      setSavingIntention(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deletingAccount) return
    setDeletingAccount(true)
    setDeleteAccountError('')

    try {
      await auth.deleteAccount()
    } catch (error) {
      console.error('Account deletion failed', error)
      setDeleteAccountError(error.message || 'Your account could not be deleted. Please try again.')
      setDeletingAccount(false)
      return
    }

    if (isIOSNative) {
      try {
        await window.FocusForgeNative.clearBlocks()
        await setActiveAccountOnNative(null)
      } catch (error) {
        console.error('Failed to clear Screen Time selection after deletion', error)
      }
    }
    clearAccountStorage()
    localStorage.removeItem('focusforge_user_id')
    localStorage.removeItem('focusforge_paywall_after_onboarding_pending')
    window.location.reload()
  }

  // Days on which anything was actually recorded. The old value here was a
  // hardcoded 47.
  const daysActive = Object.values(dailyStats || {}).filter(
    d => d.distractions || d.tasksCompleted || d.habitsCompleted || d.focusMinutes
  ).length
  const [notifications, setNotifications] = useState(true)
  const [morningReminder, setMorningReminder] = useState(true)
  const [eveningReflection, setEveningReflection] = useState(true)

  // iOS Screen Time (Family Controls) state — only used when running inside
  // the native iOS wrapper. Safe on Android/web (bridge is null there).
  const isIOSNative = typeof window !== 'undefined'
    && window.FocusForgeNative
    && window.FocusForgeNative.platform === 'ios'
  const [iosSummary, setIosSummary] = useState({ applicationsCount: 0, categoriesCount: 0, isAuthorized: false })
  const [iosPickerBusy, setIosPickerBusy] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState('UNKNOWN')
  const [paywallBusy, setPaywallBusy] = useState(false)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [manageBusy, setManageBusy] = useState(false)

  const handleManageSubscription = async () => {
    if (manageBusy) return
    setManageBusy(true)
    try {
      const result = await window.FocusForgeNative.manageSubscription()
      if (!result?.success) throw new Error('Could not open subscriptions')
    } catch {
      window.alert('Open Settings on your iPhone or iPad, tap your name, then Subscriptions. Select Focus-Forge to manage or cancel your subscription.')
    } finally {
      setManageBusy(false)
    }
  }

  React.useEffect(() => {
    if (!isIOSNative) return
    window.FocusForgeNative.getSelectionSummary().then((res) => {
      if (res && res.success !== false) setIosSummary(res)
    }).catch(() => {})
    window.FocusForgeNative.getSubscriptionStatus().then((res) => {
      setSubscriptionStatus(res?.subscriptionStatus?.status || 'UNKNOWN')
    }).catch(() => {})
  }, [isIOSNative])

  const handleIOSPickApps = async () => {
    if (!isIOSNative || iosPickerBusy) return
    setIosPickerBusy(true)
    try {
      const res = await window.FocusForgeNative.presentPicker()
      if (res && !res.cancelled) {
        setIosSummary({
          applicationsCount: res.applicationsCount || 0,
          categoriesCount: res.categoriesCount || 0,
          isAuthorized: true,
        })
      }
    } catch (e) {
      console.error('presentPicker failed', e)
    } finally {
      setIosPickerBusy(false)
    }
  }

  const handleIOSClear = async () => {
    if (!isIOSNative) return
    try {
      await window.FocusForgeNative.clearBlocks()
      setIosSummary({ applicationsCount: 0, categoriesCount: 0, isAuthorized: iosSummary.isAuthorized })
    } catch (e) {
      console.error('clearBlocks failed', e)
    }
  }

  const handleUpgrade = async () => {
    if (!isIOSNative || paywallBusy) return
    setPaywallBusy(true)
    try {
      const res = await window.FocusForgeNative.presentPaywall('campaign_trigger')
      if (!res?.success) window.alert(res?.error || 'The paywall could not be opened. Please try again.')
      const status = await window.FocusForgeNative.getSubscriptionStatus()
      setSubscriptionStatus(status?.subscriptionStatus?.status || 'UNKNOWN')
    } catch (e) {
      window.alert('The paywall could not be opened. Please try again.')
    } finally {
      setPaywallBusy(false)
    }
  }

  const handleRestorePurchases = async () => {
    if (!isIOSNative || restoreBusy) return
    setRestoreBusy(true)
    try {
      const res = await window.FocusForgeNative.restorePurchases()
      const status = await window.FocusForgeNative.getSubscriptionStatus()
      const nextStatus = status?.subscriptionStatus?.status || 'UNKNOWN'
      setSubscriptionStatus(nextStatus)
      if (res?.success && nextStatus === 'ACTIVE') {
        window.alert('Your FocusForge Pro purchase has been restored.')
      } else {
        window.alert(res?.restoration?.errorMessage || res?.error || 'No active purchase was found.')
      }
    } catch (e) {
      window.alert('Your purchase could not be restored. Please try again.')
    } finally {
      setRestoreBusy(false)
    }
  }

  return (
    <div className="ff-screen px-5 pt-14 pb-6">
      <div className="ff-brand-row"><ForgeWordmark compact /><span className="ff-kicker">CONTROL</span></div>
      <div className="mb-6">
        <h1 className="ff-title text-2xl">Settings</h1>
        <p className="text-dark-400 text-sm mt-0.5">Customize your focus experience</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'apps', label: 'Blocked Apps', icon: Shield },
          { id: 'blocking', label: 'Blocking', icon: Lock },
          { id: 'notifications', label: 'Alerts', icon: Bell },
          { id: 'profile', label: 'Profile', icon: Info },
        ].map(section => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-forge-600 text-white'
                  : 'bg-dark-900 text-dark-400 border border-dark-800'
              }`}
            >
              <Icon size={14} />
              {section.label}
            </button>
          )
        })}
      </div>

      {/* Blocked Apps Section */}
      {activeSection === 'apps' && (
        <div>
          {isIOSNative && (
            <div className="bg-gradient-to-r from-forge-900/30 to-forge-900/30 rounded-2xl p-4 mb-4 border border-forge-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-forge-400" />
                <p className="text-sm font-semibold text-forge-200">iOS Screen Time</p>
              </div>
              <p className="text-xs text-dark-300 mb-3">
                Apple requires you to pick blocked apps through the system picker.
                Tap below to choose them — once selected, they'll be shielded
                across all of iOS.
              </p>
              <p className="text-xs text-dark-400 mb-3">
                Currently blocking: <span className="font-semibold text-white">{iosSummary.applicationsCount}</span> app{iosSummary.applicationsCount === 1 ? '' : 's'}
                {iosSummary.categoriesCount > 0 && (
                  <> + <span className="font-semibold text-white">{iosSummary.categoriesCount}</span> categor{iosSummary.categoriesCount === 1 ? 'y' : 'ies'}</>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleIOSPickApps}
                  disabled={iosPickerBusy}
                  className="flex-1 bg-forge-600 hover:bg-forge-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {iosPickerBusy ? 'Opening…' : (iosSummary.applicationsCount > 0 ? 'Change blocked apps' : 'Pick apps to block')}
                </button>
                {iosSummary.applicationsCount > 0 && (
                  <button
                    onClick={handleIOSClear}
                    className="px-4 bg-dark-800 hover:bg-dark-700 text-dark-200 text-sm font-medium py-2.5 rounded-xl transition-colors border border-dark-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
          {/* The per-app toggles below are Android-only: on iOS the app can't
              choose which apps are blocked — that's owned entirely by the
              system Screen Time picker above, so showing switches here would
              imply control the app doesn't have. */}
          {!isIOSNative && (
          <>
          <p className="text-dark-400 text-xs mb-4">
            Choose which apps to block during focus sessions. When you try to open these, you'll see your goals instead.
          </p>
          <div className="space-y-2">
            {availableApps.map(app => {
              const blockedApp = blockedApps.find(b => b.package === app.package)
              const isAdded = !!blockedApp
              const isActive = blockedApp?.active || false
              const attempts = blockedApp?.attempts || 0
              
              const handleToggle = async () => {
                if (isAdded) {
                  toggleBlockedApp(blockedApp.id)
                } else {
                  // Add the app first (will be active by default), then it will show as active
                  await addBlockedApp(app)
                }
              }
              
              return (
                <div key={app.package} className="bg-dark-900 rounded-xl p-3.5 border border-dark-800 flex items-center gap-3">
                  <span className="text-2xl">{app.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark-200">{app.name}</p>
                    {attempts > 0 && (
                      <p className="text-dark-500 text-xs">{attempts} attempts today</p>
                    )}
                  </div>
                  <button
                    onClick={handleToggle}
                    className={`w-12 h-7 rounded-full relative transition-colors ${
                      isActive ? 'bg-forge-600' : 'bg-dark-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              )
            })}
          </div>
          </>
          )}
        </div>
      )}

      {/* Blocking Settings */}
      {activeSection === 'blocking' && (
        <div className="space-y-4">
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-red-400" />
                <div>
                  <p className="text-sm font-medium">Strict Mode</p>
                  <p className="text-dark-500 text-xs">Must complete a task before accessing blocked apps</p>
                </div>
              </div>
              <button
                onClick={() => toggleStrictMode()}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  strictMode ? 'bg-red-500' : 'bg-dark-700'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  strictMode ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="flex items-center gap-3 mb-3">
              <Clock size={18} className="text-amber-400" />
              <div>
                <p className="text-sm font-medium">Delay Before Access</p>
                <p className="text-dark-500 text-xs">How long the block screen makes you wait before you can continue</p>
              </div>
            </div>
            <div className="flex gap-2">
              {[30, 60, 120].map(sec => (
                <button
                  key={sec}
                  onClick={() => setAccessDelaySeconds(sec)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    accessDelaySeconds === sec
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-dark-800 text-dark-400 border border-dark-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="flex items-center gap-3">
              <Unlock size={18} className="text-emerald-400" />
              <div>
                <p className="text-sm font-medium">Quick Unlock</p>
                <p className="text-dark-500 text-xs">Allow quick access for urgent needs (limited to 3/day)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeSection === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-forge-400" />
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-dark-500 text-xs">Task and habit reminders</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  notifications ? 'bg-forge-600' : 'bg-dark-700'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  notifications ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">🌅</span>
                <div>
                  <p className="text-sm font-medium">Morning Reminder</p>
                  <p className="text-dark-500 text-xs">"Here are your tasks for today"</p>
                </div>
              </div>
              <button
                onClick={() => setMorningReminder(!morningReminder)}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  morningReminder ? 'bg-forge-600' : 'bg-dark-700'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  morningReminder ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">🌙</span>
                <div>
                  <p className="text-sm font-medium">Evening Reflection</p>
                  <p className="text-dark-500 text-xs">"How did today go? Reflect & plan."</p>
                </div>
              </div>
              <button
                onClick={() => setEveningReflection(!eveningReflection)}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  eveningReflection ? 'bg-forge-600' : 'bg-dark-700'
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                  eveningReflection ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          {isIOSNative && (
            <div className="relative overflow-hidden rounded-2xl border border-forge-400/40 bg-gradient-to-br from-dark-900 via-dark-900 to-forge-950 p-5 shadow-forge-soft">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-forge-400/10 blur-2xl" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-2 text-forge-300">
                  <Zap size={15} fill="currentColor" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.24em]">FocusForge Pro</span>
                </div>
                {subscriptionStatus === 'ACTIVE' ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3.5">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-white">Your Pro access is active</p>
                      <p className="mt-0.5 text-xs text-dark-400">All premium FocusForge features are unlocked.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="ff-title text-xl text-white">Less scrolling. <span className="text-forge-300">More living.</span></h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-dark-400">Unlock the complete focus system and build discipline that lasts.</p>
                    <button
                      onClick={handleUpgrade}
                      disabled={paywallBusy}
                      className="mt-4 w-full rounded-xl bg-forge-300 py-3 text-sm font-bold text-dark-950 transition-colors hover:bg-forge-200 disabled:opacity-60"
                    >
                      {paywallBusy ? 'Opening…' : 'Explore FocusForge Pro'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleManageSubscription}
                  disabled={manageBusy}
                  className="mt-4 w-full rounded-xl border border-forge-400/40 bg-dark-800 py-3 text-sm font-semibold text-white hover:bg-dark-700 disabled:opacity-60"
                >
                  {manageBusy ? 'Opening Apple subscriptions…' : 'Manage or cancel subscription'}
                </button>
                <p className="mt-2 text-xs leading-relaxed text-dark-400">Opens your Apple subscriptions. Select Focus-Forge to change your plan or cancel renewal. Apple shows when your access ends.</p>
                <button
                  onClick={handleRestorePurchases}
                  disabled={restoreBusy}
                  className="mt-3 w-full py-1 text-xs font-medium text-dark-400 transition-colors hover:text-dark-200 disabled:opacity-60"
                >
                  {restoreBusy ? 'Restoring…' : 'Restore purchases'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-dark-900 rounded-2xl p-5 border border-dark-800 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-forge-600 to-forge-500 mx-auto flex items-center justify-center text-3xl font-bold mb-3">
              {user.name.charAt(0)}
            </div>
            {isEditingName ? (
              <div className="mt-3 text-left">
                <label className="text-dark-500 text-[10px] font-semibold uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={60}
                  autoFocus
                  placeholder="Your name"
                  className="w-full mt-1 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-forge-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveName}
                    disabled={!nameDraft.trim() || savingName}
                    className="flex-1 bg-forge-600 hover:bg-forge-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="px-4 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm font-medium py-2.5 rounded-xl transition-colors border border-dark-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNameDraft(user.name || '')
                  setIsEditingName(true)
                }}
                className="mt-1 inline-flex items-center gap-1.5 text-lg font-bold text-white hover:text-forge-300 transition-colors"
              >
                {user.name || 'Set your name'}
                <Pencil size={13} className="text-dark-500 shrink-0" />
              </button>
            )}

            {isEditingIntention ? (
              <div className="mt-3 text-left">
                <label className="text-dark-500 text-[10px] font-semibold uppercase tracking-wider">
                  Your Intention
                </label>
                <textarea
                  value={intentionDraft}
                  onChange={(e) => setIntentionDraft(e.target.value)}
                  rows={3}
                  maxLength={140}
                  autoFocus
                  placeholder="What are you doing this for?"
                  className="w-full mt-1 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-forge-500 resize-none"
                />
                <div className="flex items-center justify-between mt-1 mb-2">
                  <span className="text-dark-600 text-[10px]">{intentionDraft.length}/140</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveIntention}
                    disabled={!intentionDraft.trim() || savingIntention}
                    className="flex-1 bg-forge-600 hover:bg-forge-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    {savingIntention ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditingIntention(false)}
                    className="px-4 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm font-medium py-2.5 rounded-xl transition-colors border border-dark-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIntentionDraft(user.intention || '')
                  setIsEditingIntention(true)
                }}
                className="mt-1 inline-flex items-center gap-1.5 text-dark-400 text-sm italic hover:text-dark-200 transition-colors"
              >
                {user.intention ? `"${user.intention}"` : 'Set your intention'}
                <Pencil size={12} className="text-dark-500 shrink-0" />
              </button>
            )}
          </div>

          <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="ff-title text-2xl text-forge-400">{user.streak}</p>
                <p className="text-dark-500 text-xs">Day Streak</p>
              </div>
              <div>
                <p className="ff-title text-2xl text-amber-400">{user.longestStreak}</p>
                <p className="text-dark-500 text-xs">Best Streak</p>
              </div>
              <div>
                <p className="ff-title text-2xl text-emerald-400">{daysActive}</p>
                <p className="text-dark-500 text-xs">Days Active</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-900 rounded-2xl border border-dark-800 overflow-hidden">
            <button
              onClick={() => setOpenPanel(openPanel === 'privacy' ? null : 'privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-dark-800/40 transition-colors"
            >
              <span className="text-sm text-dark-300">Privacy Policy</span>
              <ChevronRight
                size={16}
                className={`text-dark-500 transition-transform ${openPanel === 'privacy' ? 'rotate-90' : ''}`}
              />
            </button>
            {openPanel === 'privacy' && (
              <div className="px-4 pb-4 space-y-3 text-xs text-dark-400 leading-relaxed border-t border-dark-800 pt-3">
                <p>
                  <span className="text-dark-200 font-semibold">Stored on your device.</span> Your
                  tasks, habits, focus sessions, daily stats and distraction counts live in local
                  storage on this device. Your tasks, habits and progress are not synced across devices.
                </p>
                <p>
                  <span className="text-dark-200 font-semibold">Your account.</span> If you create
                  one, your email, name and intention are stored in our Supabase database so your
                  profile follows you across devices. Nothing is sold or shared with advertisers.
                </p>
                <p>
                  <span className="text-dark-200 font-semibold">Which apps you block.</span> On iOS
                  this is handled entirely by Apple's Screen Time. Your selection is stored on the
                  device as opaque tokens — FocusForge itself is never told which apps you picked,
                  only how many. That information cannot leave your device.
                </p>
                <p>
                  <span className="text-dark-200 font-semibold">No tracking.</span> There are no
                  ad networks in this app. Superwall processes subscription and paywall activity to present offers and determine access.
                </p>
                <p>
                  You can delete your account using Delete Account in Settings. This removes your
                  account and its local cache on this device. It does not cancel an Apple subscription.
                </p>
              </div>
            )}
          </div>

          <div className="bg-dark-900 rounded-2xl border border-dark-800 overflow-hidden">
            <button
              onClick={() => setOpenPanel(openPanel === 'about' ? null : 'about')}
              className="w-full p-4 flex items-center justify-between hover:bg-dark-800/40 transition-colors"
            >
              <span className="text-sm text-dark-300">About FocusForge</span>
              <ChevronRight
                size={16}
                className={`text-dark-500 transition-transform ${openPanel === 'about' ? 'rotate-90' : ''}`}
              />
            </button>
            {openPanel === 'about' && (
              <div className="px-4 pb-4 space-y-3 text-xs text-dark-400 leading-relaxed border-t border-dark-800 pt-3">
                <p>
                  FocusForge puts a deliberate pause between you and the apps that pull you away
                  from what you meant to do. When you open a blocked app, it shows you your
                  intention, your goals for the day and how many times you've already tried —
                  then makes you wait before it will let you through.
                </p>
                <p>
                  <span className="text-dark-200 font-semibold">How blocking works.</span> On iOS
                  it uses Apple's Screen Time (Family Controls) framework to shield the apps you
                  choose, which is why it can't be bypassed by simply force-quitting FocusForge.
                </p>
                <p>
                  <span className="text-dark-200 font-semibold">Earning your way through.</span>{' '}
                  Completing a task banks a pass. Snoozing spends one, then locks snoozing for{' '}
                  {SNOOZE_COOLDOWN_MINUTES} minutes. "Continue anyway" is capped at{' '}
                  {MAX_PROCEEDS_PER_DAY} times a day, so the escape hatch can't become the habit.
                </p>
                <div className="flex items-center justify-between pt-1 text-dark-500">
                  <span>Version</span>
                  <span className="text-dark-300 font-medium">{APP_VERSION}</span>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={async () => {
              if (confirm('Are you sure you want to log out? This will clear your local session.')) {
                try { await auth.signOut() } catch (e) { console.error(e) }
                await setActiveAccountOnNative(null)
                await syncBlockedAppsToNative([])
                localStorage.removeItem('focusforge_user_id')
                window.location.reload()
              }
            }}
            className="w-full bg-red-500/10 rounded-2xl p-4 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <span className="text-sm text-red-400 font-medium">Log Out</span>
          </button>

          <button
            onClick={() => {
              setDeleteAccountError('')
              setShowDeleteConfirm(true)
            }}
            className="w-full mt-3 rounded-2xl p-4 border border-red-500/10 text-red-500/70 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <span className="text-xs font-medium">Delete Account</span>
          </button>

          {showDeleteConfirm && (
            <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-300 font-medium">Delete account permanently?</p>
              <p className="mt-2 text-xs text-dark-400 leading-relaxed">
                This removes your FocusForge account, profile, and local tasks, habits, and progress.
                Your Apple subscription is managed separately and is not canceled by this action.
              </p>
              {deleteAccountError && (
                <p className="mt-3 text-xs text-red-400 leading-relaxed">{deleteAccountError}</p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAccount}
                  className="flex-1 rounded-xl border border-dark-700 p-3 text-xs font-medium text-dark-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="flex-1 rounded-xl bg-red-500/20 p-3 text-xs font-semibold text-red-300 disabled:opacity-50"
                >
                  {deletingAccount ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-4">
            <p className="text-dark-600 text-xs">FocusForge v1.0.0</p>
            <p className="text-dark-700 text-[10px] mt-1">Turn distractions into discipline.</p>
          </div>
        </div>
      )}
    </div>
  )
}
