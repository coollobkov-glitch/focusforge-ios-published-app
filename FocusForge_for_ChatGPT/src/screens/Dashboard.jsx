import React, { useEffect, useState } from 'react'
import { Flame, Target, Shield, Timer, ChevronRight, Zap, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useStore from '../store/useStore'
import { ForgeWordmark } from './ForgeBrand'

export default function Dashboard() {
  const { user, tasks, habits, blockedApps, getDailyProgress, activeFocusTimer, focusTimeRemaining, tickTimer, setCurrentTab, distractionAttempts, dailyStats } = useStore()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
      tickTimer()
    }, 1000)
    return () => clearInterval(interval)
  }, [tickTimer])

  const completedTasks = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length
  const completedHabits = habits.filter(h => h.completed).length
  const totalHabits = habits.length
  const dailyProgress = getDailyProgress()
  // Apple's Screen Time API never reveals which app triggered the shield
  // (privacy), so blockedApps' per-app `attempts` can't be attributed on
  // iOS — this is the real daily total, tracked separately in the store.
  const totalAttempts = distractionAttempts
  const activeBlockedApps = blockedApps.filter(a => a.active)

  // This week's real per-day attempts (Mon-first), from the persisted
  // daily history. JS getDay() is Sun-first, so shift to a Mon-first index.
  const todayIdx = (now.getDay() + 6) % 7
  const dayKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekData = weekDays.map((day, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - todayIdx + i)
    return { day, attempts: dailyStats[dayKey(d)]?.distractions || 0 }
  })
  const weekTotal = weekData.reduce((sum, d) => sum + d.attempts, 0)
  const weekAvg = (weekTotal / (todayIdx + 1)).toFixed(1)

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="ff-screen px-5 pt-14 pb-6">
      {/* Brand + Header */}
      <div className="ff-brand-row">
        <ForgeWordmark compact />
        <div className="px-2.5 py-1 rounded-full border border-forge-500/20 bg-forge-500/5">
          <span className="ff-kicker">DISCIPLINE</span>
        </div>
      </div>
      <div className="mb-6">
        <h1 className="ff-title text-2xl">{greeting()}, {user.name}</h1>
        <p className="text-dark-400 text-sm mt-1">Small choices. Big life.</p>
      </div>

      {/* Discipline Score */}
      <div className="ff-hero-card rounded-3xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-dark-400 text-xs font-medium uppercase tracking-wider">Discipline Score</p>
            <p className="ff-title text-4xl mt-1">
              {dailyProgress}
              <span className="text-lg text-dark-400">%</span>
            </p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-dark-700 relative flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-dark-700"
              />
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="4"
                strokeDasharray={`${(dailyProgress / 100) * 175.9} 175.9`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#37d6e6" />
                  <stop offset="100%" stopColor="#2598f4" />
                </linearGradient>
              </defs>
            </svg>
            <Zap size={20} className="text-forge-400" />
          </div>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-forge-600 to-success transition-all duration-700"
            style={{ width: `${dailyProgress}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button onClick={() => setCurrentTab('tasks')} className="bg-dark-900 rounded-2xl p-4 border border-dark-800 text-left hover:border-dark-600 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-forge-400" />
            <span className="text-dark-400 text-xs font-medium">Tasks</span>
          </div>
          <p className="ff-title text-2xl">
            {completedTasks}<span className="text-dark-500 text-lg">/{totalTasks}</span>
          </p>
          <p className="text-dark-500 text-xs mt-0.5">completed today</p>
        </button>

        <button onClick={() => setCurrentTab('habits')} className="bg-dark-900 rounded-2xl p-4 border border-dark-800 text-left hover:border-dark-600 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-amber-400" />
            <span className="text-dark-400 text-xs font-medium">Habits</span>
          </div>
          <p className="ff-title text-2xl">
            {completedHabits}<span className="text-dark-500 text-lg">/{totalHabits}</span>
          </p>
          <p className="text-dark-500 text-xs mt-0.5">completed today</p>
        </button>

        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-red-400" />
            <span className="text-dark-400 text-xs font-medium">Blocked</span>
          </div>
          <p className="ff-title text-2xl text-red-400">{totalAttempts}</p>
          <p className="text-dark-500 text-xs mt-0.5">distraction attempts</p>
        </div>

        <div className="bg-dark-900 rounded-2xl p-4 border border-dark-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-dark-400 text-xs font-medium">Streak</span>
          </div>
          <p className="ff-title text-2xl text-emerald-400">{user.streak}</p>
          <p className="text-dark-500 text-xs mt-0.5">day focus streak</p>
        </div>
      </div>

      {/* Weekly Distraction Attempts Chart */}
      <div className="bg-dark-900 rounded-2xl p-4 mb-4 border border-dark-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-dark-300">Weekly Distractions</h3>
            <p className="text-xs text-dark-500 mt-0.5">Blocked app attempts this week</p>
          </div>
          <div className="text-right">
            <p className="ff-title text-lg text-red-400">{weekAvg}</p>
            <p className="text-dark-500 text-xs">avg / day</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f2a42" vertical={false} />
            <XAxis 
              dataKey="day" 
              tick={{ fill: '#5c7b90', fontSize: 12 }}
              axisLine={{ stroke: '#17354c' }}
            />
            <YAxis 
              tick={{ fill: '#5c7b90', fontSize: 12 }}
              axisLine={{ stroke: '#17354c' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#071524', border: '1px solid rgba(55,214,230,.18)', borderRadius: '12px', padding: '8px 12px' }}
              labelStyle={{ color: '#d5e8f2', fontSize: '12px', fontWeight: '600' }}
              itemStyle={{ color: '#ef4444', fontSize: '12px' }}
              cursor={{ fill: '#0b2034' }}
            />
            <Bar dataKey="attempts" radius={[6, 6, 0, 0]}>
              {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === todayIdx ? '#ef4444' : '#f87171'}
                  fillOpacity={index > todayIdx ? 0.25 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Focus Timer */}
      {activeFocusTimer && (
        <div className="bg-gradient-to-r from-forge-900/50 to-forge-900/50 rounded-2xl p-4 mb-4 border border-forge-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forge-600/20 flex items-center justify-center">
                <Timer size={20} className="text-forge-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Focus Session Active</p>
                <p className="text-dark-400 text-xs">Stay locked in</p>
              </div>
            </div>
            <p className="ff-title text-2xl font-mono text-forge-400">{formatTime(focusTimeRemaining)}</p>
          </div>
        </div>
      )}

      {/* Intention */}
      <div className="bg-dark-900 rounded-2xl p-4 mb-4 border border-dark-800">
        <p className="text-dark-500 text-xs font-medium uppercase tracking-wider mb-2">Your Intention</p>
        <p className="text-sm text-dark-200 italic leading-relaxed">"{user.intention}"</p>
      </div>

      {/* Incomplete Tasks Preview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-dark-300">Remaining Tasks</h3>
          <button onClick={() => setCurrentTab('tasks')} className="text-forge-400 text-xs flex items-center gap-0.5 hover:text-forge-300">
            View all <ChevronRight size={12} />
          </button>
        </div>
        {tasks.filter(t => !t.completed).slice(0, 3).map(task => (
          <div key={task.id} className="flex items-center gap-3 py-2.5 border-b border-dark-800/50 last:border-0">
            <div className="w-5 h-5 rounded-full border-2 border-dark-600 flex-shrink-0" />
            <p className="text-sm text-dark-300">{task.title}</p>
          </div>
        ))}
      </div>

      {/* Most Distracting Apps */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-dark-300 mb-3">Top Distractions Today</h3>
        <div className="flex gap-2 flex-wrap">
          {blockedApps
            .filter(a => a.attempts > 0)
            .sort((a, b) => b.attempts - a.attempts)
            .slice(0, 4)
            .map(app => (
              <div key={app.id} className="bg-dark-900 rounded-xl px-3 py-2 border border-dark-800 flex items-center gap-2">
                <span className="text-lg">{app.icon}</span>
                <span className="text-xs text-dark-400">{app.name}</span>
                <span className="text-xs font-bold text-red-400">{app.attempts}x</span>
              </div>
            ))}
        </div>
      </div>

    </div>
  )
}
