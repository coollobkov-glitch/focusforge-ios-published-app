import React, { useState } from 'react'
import { BarChart3, TrendingDown, TrendingUp, Clock, Shield, Target, Flame, Zap } from 'lucide-react'
import useStore from '../store/useStore'
import useIOSBlockSummary from '../lib/useIOSBlockSummary'
import { ForgeWordmark } from './ForgeBrand'

const PERIOD_LABEL = { day: 'today', week: 'this week', month: 'this month' }

export default function Analytics() {
  const { getDailySeries, getCalendarWeekSeries, getCalendarMonthSeries, dailyStats, blockedApps, user } = useStore()
  const [period, setPeriod] = useState('week')

  // `dailyStats` is read so this recomputes whenever a stat is recorded.
  // Week and month use their real calendar ranges so today appears on the
  // correct weekday/date rather than always occupying the last bar.
  const series = React.useMemo(() => {
    if (period === 'week') return getCalendarWeekSeries()
    if (period === 'month') return getCalendarMonthSeries()
    return getDailySeries(1)
  }, [getCalendarWeekSeries, getCalendarMonthSeries, getDailySeries, period, dailyStats])
  const days = series.length

  const sum = (field) => series.reduce((total, d) => total + d[field], 0)
  const totalDistractions = sum('distractions')
  const totalTasksCompleted = sum('tasksCompleted')
  const totalHabitsCompleted = sum('habitsCompleted')
  const totalFocusMinutes = sum('focusMinutes')

  const avgDistractions = (totalDistractions / days).toFixed(1)
  // Each blocked attempt is treated as ~8 minutes of scrolling avoided.
  const timeSavedHours = (totalDistractions * 8 / 60).toFixed(1)
  const focusHours = (totalFocusMinutes / 60).toFixed(1)

  // Weekday initial for a week view, calendar day for month, and Today for day.
  const labelFor = (d, index) =>
    period === 'day' ? 'Today' : period === 'month' ? String(d.dateObj.getDate()) : ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.dateObj.getDay()]
  const showValues = days <= 7

  const { summary: iosSummary, isIOS } = useIOSBlockSummary()

  const topApps = [...blockedApps]
    .filter(a => a.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
  const activeBlockedApps = blockedApps.filter(a => a.active)
  // Per-app attempts are only ever recorded on Android; on iOS the shield never
  // reports which app was opened, so these bars would be misleading there.
  const showPerApp = !isIOS && topApps.length > 0
  const iosBlockedTotal = iosSummary.applicationsCount + iosSummary.categoriesCount

  const hasAnyData = series.some(
    d => d.distractions || d.tasksCompleted || d.habitsCompleted || d.focusMinutes
  )

  // One renderer for every chart — they only differ by field and colour.
  const Chart = ({ title, field, gradient, accent, suffix = '' }) => {
    const max = Math.max(...series.map(d => d[field]), 0)
    return (
      <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-dark-300">{title}</h3>
          <span className="text-xs text-dark-500">peak {max}{suffix}</span>
        </div>
        <div className={`flex items-end gap-1 h-32 ${period === 'day' ? 'justify-center' : 'justify-between'}`}>
          {series.map((d, i) => {
            const height = max > 0 ? (d[field] / max) * 100 : 0
            const isToday = d.dateObj.toDateString() === new Date().toDateString()
            const showLabel = period !== 'month' || i === 0 || (i + 1) % 5 === 0
            return (
              <div key={d.date} className={`${period === 'day' ? 'w-14' : 'flex-1 min-w-0'} flex flex-col items-center gap-1`}>
                {showValues && (
                  <span className="text-[10px] text-dark-500 font-medium">{d[field]}</span>
                )}
                <div className="w-full relative" style={{ height: '100px' }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${
                      isToday ? gradient : 'bg-dark-700'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${isToday ? accent : 'text-dark-500'}`}
                >
                  {showLabel ? labelFor(d, i) : '\u00a0'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="ff-screen px-5 pt-14 pb-6">
      <div className="ff-brand-row"><ForgeWordmark compact /><span className="ff-kicker">INSIGHTS</span></div>
      <div className="mb-6">
        <h1 className="ff-title text-2xl">Analytics</h1>
        <p className="text-dark-400 text-sm mt-0.5">Your discipline in numbers</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-6">
        {['day', 'week', 'month'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
              period === p
                ? 'bg-forge-600 text-white'
                : 'bg-dark-900 text-dark-400 border border-dark-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-red-400" />
            <span className="text-dark-500 text-xs">Distractions</span>
          </div>
          <p className="ff-title text-2xl text-red-400">{totalDistractions}</p>
          <p className="text-dark-500 text-xs mt-0.5">{avgDistractions}/day avg</p>
        </div>
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-emerald-400" />
            <span className="text-dark-500 text-xs">Time Saved</span>
          </div>
          <p className="ff-title text-2xl text-emerald-400">~{timeSavedHours}h</p>
          <p className="text-dark-500 text-xs mt-0.5">estimated {PERIOD_LABEL[period]}</p>
        </div>
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-forge-400" />
            <span className="text-dark-500 text-xs">Tasks Done</span>
          </div>
          <p className="ff-title text-2xl">{totalTasksCompleted}</p>
          <p className="text-dark-500 text-xs mt-0.5">{PERIOD_LABEL[period]}</p>
        </div>
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={14} className="text-amber-400" />
            <span className="text-dark-500 text-xs">Habits Done</span>
          </div>
          <p className="ff-title text-2xl">{totalHabitsCompleted}</p>
          <p className="text-dark-500 text-xs mt-0.5">{PERIOD_LABEL[period]}</p>
        </div>
        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800 col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-forge-400" />
            <span className="text-dark-500 text-xs">Focused Time</span>
          </div>
          <p className="ff-title text-2xl text-forge-400">{focusHours}h</p>
          <p className="text-dark-500 text-xs mt-0.5">{totalFocusMinutes} minutes {PERIOD_LABEL[period]}</p>
        </div>
      </div>

      {!hasAnyData && (
        <div className="bg-dark-900 rounded-2xl p-5 border border-dark-800 mb-4 text-center">
          <BarChart3 size={22} className="text-dark-600 mx-auto mb-2" />
          <p className="text-sm text-dark-300 font-medium">No data yet</p>
          <p className="text-xs text-dark-500 mt-1">
            Complete tasks, run focus sessions and your stats will build up here.
          </p>
        </div>
      )}

      <Chart
        title="Distraction Attempts"
        field="distractions"
        gradient="bg-gradient-to-t from-red-500 to-red-400"
        accent="text-red-400"
      />

      <Chart
        title="Tasks Completed"
        field="tasksCompleted"
        gradient="bg-gradient-to-t from-forge-600 to-forge-400"
        accent="text-forge-400"
      />

      <Chart
        title="Habits Completed"
        field="habitsCompleted"
        gradient="bg-gradient-to-t from-amber-500 to-amber-400"
        accent="text-amber-400"
      />

      <Chart
        title="Focus Minutes"
        field="focusMinutes"
        gradient="bg-gradient-to-t from-forge-600 to-forge-400"
        accent="text-forge-400"
        suffix="m"
      />

      {/* Blocked Apps.
          On iOS, Screen Time never tells the app which app triggered the
          shield, so attempts can only be shown as a single total — per-app
          bars are only meaningful where `attempts` is actually recorded. */}
      <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800 mb-4">
        <h3 className="text-sm font-semibold text-dark-300 mb-3">
          {showPerApp ? 'Most Distracting Apps' : 'Apps Being Blocked'}
        </h3>
        {showPerApp ? (
          <div className="space-y-3">
            {topApps.map((app) => {
              const maxAttempts = topApps[0]?.attempts || 1
              const width = (app.attempts / maxAttempts) * 100
              return (
                <div key={app.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{app.icon}</span>
                      <span className="text-sm text-dark-300">{app.name}</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">{app.attempts}x</span>
                  </div>
                  <div className="w-full bg-dark-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : isIOS ? (
          // Screen Time hands over counts and nothing else, so this reports the
          // real shield rather than the onboarding list, which on iOS is unused.
          <>
            {iosBlockedTotal > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {iosSummary.applicationsCount > 0 && (
                  <div className="bg-dark-800/60 rounded-xl px-3 py-2 border border-dark-700">
                    <span className="text-sm font-semibold text-white">{iosSummary.applicationsCount}</span>
                    <span className="text-xs text-dark-300"> app{iosSummary.applicationsCount === 1 ? '' : 's'}</span>
                  </div>
                )}
                {iosSummary.categoriesCount > 0 && (
                  <div className="bg-dark-800/60 rounded-xl px-3 py-2 border border-dark-700">
                    <span className="text-sm font-semibold text-white">{iosSummary.categoriesCount}</span>
                    <span className="text-xs text-dark-300"> categor{iosSummary.categoriesCount === 1 ? 'y' : 'ies'}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-dark-500">
                {iosSummary.isAuthorized
                  ? 'Nothing is being blocked yet — pick apps in Settings.'
                  : 'Screen Time access hasn\u2019t been granted yet. Enable it in Settings to start blocking.'}
              </p>
            )}
            {iosBlockedTotal > 0 && (
              <p className="text-[11px] text-dark-500 mt-3 leading-relaxed">
                Screen Time keeps your choices private, so iOS only tells the app
                how many apps and categories are shielded — never which ones, or
                which one triggered a block. Attempts are counted as one daily
                total. Manage the list in Settings.
              </p>
            )}
          </>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {activeBlockedApps.length > 0 ? (
              activeBlockedApps.map(app => (
                <div
                  key={app.id}
                  className="bg-dark-800/60 rounded-xl px-3 py-2 border border-dark-700 flex items-center gap-2"
                >
                  <span className="text-base">{app.icon}</span>
                  <span className="text-xs text-dark-300">{app.name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-dark-500">No apps are being blocked yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Focus Streak */}
      <div className="bg-gradient-to-br from-forge-900/30 to-forge-900/30 rounded-2xl p-4 border border-forge-700/20">
        <div className="flex items-center gap-3">
          <Zap size={20} className="text-forge-400" />
          <div>
            <p className="text-sm font-semibold">Focus Streak</p>
            <p className="text-dark-400 text-xs">{user.streak} consecutive days of discipline</p>
          </div>
          <p className="ml-auto text-2xl font-bold text-forge-400">{user.streak}🔥</p>
        </div>
      </div>
    </div>
  )
}
