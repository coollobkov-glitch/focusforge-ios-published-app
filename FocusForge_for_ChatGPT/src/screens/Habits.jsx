import React, { useState } from 'react'
import { Plus, Flame, Check, Trash2, Trophy, X } from 'lucide-react'
import useStore from '../store/useStore'
import useSelectionMode from '../lib/useSelectionMode'
import { ForgeWordmark } from './ForgeBrand'

const defaultIcons = ['💪', '🤲', '📝', '📖', '📚', '💧', '🌙', '🚫', '🧘', '🏃', '🎯', '⏰']

export default function Habits() {
  const { habits, addHabit, toggleHabit, deleteHabit, user, getDailyProgress } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newHabit, setNewHabit] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('💪')
  const select = useSelectionMode()

  // In selecting mode a tap marks the row for deletion instead of completing it.
  const handleRowPress = (id) =>
    select.isSelecting ? select.toggleSelected(id) : toggleHabit(id)

  const completedHabits = habits.filter(h => h.completed)
  const incompleteHabits = habits.filter(h => !h.completed)
  const dailyProgress = getDailyProgress()

  const handleAdd = () => {
    if (!newHabit.trim()) return
    addHabit({ title: newHabit.trim(), icon: selectedIcon, color: '#37d6e6' })
    setNewHabit('')
    setShowAdd(false)
  }

  return (
    <div className="ff-screen px-5 pt-14 pb-6">
      {/* Header */}
      <div className="ff-brand-row"><ForgeWordmark compact /><span className="ff-kicker">STREAKS</span></div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ff-title text-2xl">Habits</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {select.isSelecting
              ? 'Tap habits to select, then delete'
              : `${completedHabits.length} of ${habits.length} completed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {habits.length > 0 && (
            <button
              onClick={() => (select.isSelecting ? select.cancel() : select.start())}
              aria-label={select.isSelecting ? 'Cancel selection' : 'Select habits to delete'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                select.isSelecting
                  ? 'bg-dark-800 border-dark-600 text-dark-200'
                  : 'bg-dark-900 border-dark-800 text-dark-400 hover:text-red-400 hover:border-red-500/40'
              }`}
            >
              {select.isSelecting ? <X size={18} /> : <Trash2 size={18} />}
            </button>
          )}
          {!select.isSelecting && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              aria-label="Add habit"
              className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center hover:bg-amber-400 transition-colors"
            >
              <Plus size={20} className="text-dark-950" />
            </button>
          )}
        </div>
      </div>

      {/* Today's Progress — same card as Tasks page */}
      <div className="bg-dark-900 rounded-2xl p-4 mb-5 border border-dark-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-dark-400 text-xs font-medium">Today's Progress</span>
          <span className="text-sm font-bold">{dailyProgress}%</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-forge-600 to-success transition-all duration-700"
            style={{ width: `${dailyProgress}%` }}
          />
        </div>
      </div>

      {/* Streak Card */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-4 mb-5 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Trophy size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-dark-400 text-xs font-medium">Habit Streak</p>
            <p className="ff-title text-2xl text-amber-400">{user.streak} days</p>
          </div>
          <div className="text-right">
            <p className="text-dark-500 text-xs">Best</p>
            <p className="text-sm font-semibold text-dark-300">{user.longestStreak} days</p>
          </div>
        </div>
      </div>

      {/* Add Habit */}
      {showAdd && !select.isSelecting && (
        <div className="bg-dark-900 rounded-2xl p-4 mb-4 border border-amber-500/30">
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="New habit name..."
            className="w-full bg-dark-800 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-amber-500 mb-3"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {defaultIcons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                    selectedIcon === icon
                      ? 'bg-amber-500/20 ring-1 ring-amber-500'
                      : 'bg-dark-800 hover:bg-dark-700'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <button
              onClick={handleAdd}
              className="bg-amber-500 text-dark-950 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-400 transition-colors ml-2 flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Incomplete Habits */}
      {incompleteHabits.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">Remaining</h3>
          <div className="space-y-2">
            {incompleteHabits.map(habit => (
              <div
                key={habit.id}
                role="button"
                onClick={() => handleRowPress(habit.id)}
                className={`rounded-xl p-3.5 border flex items-center gap-3 cursor-pointer transition-colors ${
                  select.isSelected(habit.id)
                    ? 'bg-red-500/10 border-red-500/40'
                    : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                }`}
              >
                {select.isSelecting ? (
                  <div
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      select.isSelected(habit.id)
                        ? 'bg-red-500 border-red-500'
                        : 'border-dark-700 bg-dark-800'
                    }`}
                  >
                    {select.isSelected(habit.id)
                      ? <Check size={18} className="text-white" />
                      : <span className="text-lg">{habit.icon}</span>}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center flex-shrink-0 text-lg">
                    {habit.icon}
                  </div>
                )}
                <p className="text-sm text-dark-200 flex-1">{habit.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Habits */}
      {completedHabits.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">Completed</h3>
          <div className="space-y-2">
            {completedHabits.map(habit => (
              <div
                key={habit.id}
                role="button"
                onClick={() => handleRowPress(habit.id)}
                className={`rounded-xl p-3.5 border flex items-center gap-3 cursor-pointer transition-colors ${
                  select.isSelected(habit.id)
                    ? 'bg-red-500/10 border-red-500/40'
                    : 'bg-dark-900/50 border-dark-800/50 hover:border-dark-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    select.isSelected(habit.id) ? 'bg-red-500' : 'bg-emerald-500/20'
                  }`}
                >
                  <Check size={20} className={select.isSelected(habit.id) ? 'text-white' : 'text-emerald-400'} />
                </div>
                <p className="text-sm text-dark-500 flex-1 line-through">{habit.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <div className="text-center py-16">
          <Flame size={40} className="text-dark-700 mx-auto mb-3" />
          <p className="text-dark-500 text-sm">No habits yet. Start building your routine!</p>
        </div>
      )}

      {/* Delete bar — only while selecting. Sits above the tab bar. */}
      {select.isSelecting && (
        <div className="fixed bottom-24 left-0 right-0 px-5 z-20">
          <div className="max-w-md mx-auto bg-dark-900/95 backdrop-blur-sm border border-dark-700 rounded-2xl p-3 shadow-xl">
            {select.isConfirming ? (
              <>
                <p className="text-xs text-dark-300 text-center mb-2.5">
                  Delete {select.count} {select.count === 1 ? 'habit' : 'habits'} permanently?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={select.cancel}
                    className="flex-1 bg-dark-800 border border-dark-700 text-dark-200 text-sm font-medium py-2.5 rounded-xl hover:border-dark-600 transition-colors"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => select.confirmDelete(deleteHabit)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={select.cancel}
                  className="flex-1 bg-dark-800 border border-dark-700 text-dark-200 text-sm font-medium py-2.5 rounded-xl hover:border-dark-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={select.requestConfirm}
                  disabled={select.count === 0}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {select.count === 0 ? 'Select habits' : `Delete (${select.count})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
