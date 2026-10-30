import React, { useState } from 'react'
import { Plus, Check, Trash2, Target, Lock, X } from 'lucide-react'
import useStore from '../store/useStore'
import useSelectionMode from '../lib/useSelectionMode'
import { ForgeWordmark } from './ForgeBrand'

const TIER = {
  primary:    { label: 'Primary',    limit: 1,    badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/25', check: 'bg-yellow-500' },
  secondary:  { label: 'Secondary',  limit: 2,    badge: 'bg-forge-500/15 text-forge-400 border-forge-500/25',    check: 'bg-forge-600'  },
  additional: { label: 'Additional', limit: null, badge: 'bg-dark-700 text-dark-400 border-dark-600',             check: 'bg-dark-600'   },
}

const TIER_ORDER = ['primary', 'secondary', 'additional']

export default function Tasks() {
  const { tasks, addTask, toggleTask, deleteTask, getDailyProgress } = useStore()
  const [newTask, setNewTask] = useState('')
  const [newType, setNewType] = useState('primary')
  const [showAdd, setShowAdd] = useState(false)
  const select = useSelectionMode()

  // In selecting mode a tap marks the row for deletion instead of completing it.
  const handleRowPress = (id) =>
    select.isSelecting ? select.toggleSelected(id) : toggleTask(id)

  const completedCount = tasks.filter(t => t.completed).length
  const total = tasks.length
  // "Today's Progress" is the same combined tasks+habits metric shown on
  // Dashboard and Habits — it used to be task-only here, which is why it
  // never matched the other two pages.
  const progress = getDailyProgress()

  const countOf = (type) => tasks.filter(t => t.taskType === type).length
  const atLimit = (type) => TIER[type].limit !== null && countOf(type) >= TIER[type].limit

  const handleAdd = () => {
    if (!newTask.trim()) return
    addTask({ title: newTask.trim(), taskType: newType })
    setNewTask('')
    setShowAdd(false)
  }

  // All tasks sorted: incomplete first (primary → secondary → additional), then completed
  const incomplete = TIER_ORDER.flatMap(type => tasks.filter(t => t.taskType === type && !t.completed))
  const completed  = TIER_ORDER.flatMap(type => tasks.filter(t => t.taskType === type && t.completed))
  const allSorted  = [...incomplete, ...completed]

  return (
    <div className="ff-screen px-5 pt-14 pb-6">
      {/* Header */}
      <div className="ff-brand-row"><ForgeWordmark compact /><span className="ff-kicker">TARGETS</span></div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="ff-title text-2xl">Tasks</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {select.isSelecting
              ? 'Tap tasks to select, then delete'
              : `${completedCount} of ${total} completed`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <button
              onClick={() => (select.isSelecting ? select.cancel() : select.start())}
              aria-label={select.isSelecting ? 'Cancel selection' : 'Select tasks to delete'}
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
              aria-label="Add task"
              className="w-10 h-10 rounded-xl bg-forge-600 flex items-center justify-center hover:bg-forge-500 transition-colors"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-dark-900 rounded-2xl p-4 mb-5 border border-dark-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-dark-400 text-xs font-medium">Today's Progress</span>
          <span className="text-sm font-bold">{progress}%</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-forge-600 to-success transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Add Task */}
      {showAdd && !select.isSelecting && (
        <div className="bg-dark-900 rounded-2xl p-4 mb-4 border border-forge-700/50">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What do you need to accomplish?"
            className="w-full bg-dark-800 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:ring-1 focus:ring-forge-500 mb-3"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          {/* Tier selector — its own row so it can wrap without squeezing Add */}
          <div className="flex gap-2 flex-wrap mb-3">
            {TIER_ORDER.map(type => {
              const locked = atLimit(type)
              return (
                <button
                  key={type}
                  onClick={() => !locked && setNewType(type)}
                  disabled={locked}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    locked
                      ? 'opacity-35 cursor-not-allowed bg-dark-800 border-dark-700 text-dark-500'
                      : newType === type
                        ? TIER[type].badge
                        : 'text-dark-500 bg-dark-800 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  {locked && <Lock size={9} />}
                  {TIER[type].label}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTask.trim()}
            className="w-full bg-forge-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-forge-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Task
          </button>
        </div>
      )}

      {/* To Do */}
      {incomplete.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">To Do</h3>
          <div className="space-y-2">
            {incomplete.map(task => {
              const tier = TIER[task.taskType] || TIER.additional
              return (
                <div
                  key={task.id}
                  role="button"
                  onClick={() => handleRowPress(task.id)}
                  className={`rounded-xl p-3.5 border flex items-center gap-3 cursor-pointer transition-colors ${
                    select.isSelected(task.id)
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                  }`}
                >
                  {select.isSelecting ? (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        select.isSelected(task.id)
                          ? 'bg-red-500 border-red-500'
                          : 'border-dark-600'
                      }`}
                    >
                      {select.isSelected(task.id) && <Check size={13} className="text-white" />}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg border-2 border-dark-600 flex-shrink-0" />
                  )}
                  <p className="text-sm flex-1 text-dark-200">{task.title}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${tier.badge}`}>
                    {tier.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-3">Completed</h3>
          <div className="space-y-2">
            {completed.map(task => {
              const tier = TIER[task.taskType] || TIER.additional
              return (
                <div
                  key={task.id}
                  role="button"
                  onClick={() => handleRowPress(task.id)}
                  className={`rounded-xl p-3.5 border flex items-center gap-3 cursor-pointer transition-colors ${
                    select.isSelected(task.id)
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-dark-900/50 border-dark-800/50 hover:border-dark-700'
                  }`}
                >
                  {select.isSelecting ? (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        select.isSelected(task.id)
                          ? 'bg-red-500 border-red-500'
                          : 'border-dark-600'
                      }`}
                    >
                      {select.isSelected(task.id) && <Check size={13} className="text-white" />}
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${tier.check}`}>
                      <Check size={13} className="text-white" />
                    </div>
                  )}
                  <p className="text-sm flex-1 line-through text-dark-500">{task.title}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border opacity-50 ${tier.badge}`}>
                    {tier.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-16">
          <Target size={40} className="text-dark-700 mx-auto mb-3" />
          <p className="text-dark-500 text-sm">No tasks yet. Add your first goal!</p>
        </div>
      )}

      {/* Delete bar — only while selecting. Sits above the tab bar. */}
      {select.isSelecting && (
        <div className="fixed bottom-24 left-0 right-0 px-5 z-20">
          <div className="max-w-md mx-auto bg-dark-900/95 backdrop-blur-sm border border-dark-700 rounded-2xl p-3 shadow-xl">
            {select.isConfirming ? (
              <>
                <p className="text-xs text-dark-300 text-center mb-2.5">
                  Delete {select.count} {select.count === 1 ? 'task' : 'tasks'} permanently?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={select.cancel}
                    className="flex-1 bg-dark-800 border border-dark-700 text-dark-200 text-sm font-medium py-2.5 rounded-xl hover:border-dark-600 transition-colors"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => select.confirmDelete(deleteTask)}
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
                  {select.count === 0 ? 'Select tasks' : `Delete (${select.count})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
