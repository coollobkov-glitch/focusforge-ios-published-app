import React, { useState, useEffect } from 'react'
import { Play, Square } from 'lucide-react'
import useStore from '../store/useStore'
import { ForgeWordmark } from './ForgeBrand'

const presetTimers = [
  { label: '15 min', minutes: 15 },
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '120 min', minutes: 120 },
]

export default function Focus() {
  const { activeFocusTimer, focusTimeRemaining, startFocusTimer, stopFocusTimer, tickTimer } = useStore()
  const [selectedMinutes, setSelectedMinutes] = useState(25)

  useEffect(() => {
    if (!activeFocusTimer) return
    const interval = setInterval(tickTimer, 1000)
    return () => clearInterval(interval)
  }, [activeFocusTimer, tickTimer])

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = activeFocusTimer
    ? 1 - (focusTimeRemaining / (activeFocusTimer.duration * 60))
    : 0

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="ff-screen px-5 pt-14 pb-6">
      <div className="ff-brand-row">
        <ForgeWordmark compact />
        <span className="ff-kicker">DEEP WORK</span>
      </div>
      <div className="mb-6">
        <h1 className="ff-title text-2xl">Focus Session</h1>
        <p className="text-dark-400 text-sm mt-1">Stay locked in. Every second counts.</p>
      </div>

      {/* Timer Circle */}
      <div className="flex items-center justify-center mb-8">
        <div className="ff-timer-shell relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle
              cx="130" cy="130" r="120"
              fill="none"
              stroke="#0b2034"
              strokeWidth="6"
            />
            {activeFocusTimer && (
              <circle
                cx="130" cy="130" r="120"
                fill="none"
                stroke="url(#timerGrad)"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            )}
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#37d6e6" />
                <stop offset="100%" stopColor="#2598f4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {activeFocusTimer ? (
              <>
                <p className="text-5xl font-bold font-mono tracking-tight">{formatTime(focusTimeRemaining)}</p>
                <p className="text-dark-400 text-sm mt-2">remaining</p>
              </>
            ) : (
              <>
                <p className="text-5xl font-bold font-mono tracking-tight">{selectedMinutes}</p>
                <p className="text-dark-400 text-sm mt-1">minutes</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Timer Presets */}
      {!activeFocusTimer && (
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          {presetTimers.map(preset => (
            <button
              key={preset.minutes}
              onClick={() => setSelectedMinutes(preset.minutes)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedMinutes === preset.minutes
                  ? 'bg-forge-600 text-white'
                  : 'bg-dark-900 text-dark-400 border border-dark-800 hover:border-dark-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Start / Stop Button */}
      <div className="flex justify-center">
        {activeFocusTimer ? (
          <button
            onClick={stopFocusTimer}
            className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition-all"
          >
            <Square size={24} className="text-red-400" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => startFocusTimer(selectedMinutes)}
            className="w-16 h-16 rounded-full bg-forge-600 flex items-center justify-center hover:bg-forge-500 transition-all shadow-lg shadow-forge-600/30"
          >
            <Play size={28} className="text-white ml-1" fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  )
}
