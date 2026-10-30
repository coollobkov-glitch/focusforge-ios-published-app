import React from 'react'
import { LayoutDashboard, CheckSquare, Flame, Timer, BarChart3, Settings } from 'lucide-react'
import useStore from '../store/useStore'

const tabs = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'habits', label: 'Habits', icon: Flame },
  { id: 'focus', label: 'Focus', icon: Timer },
  { id: 'analytics', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function BottomNav() {
  const { currentTab, setCurrentTab } = useStore()

  return (
    <div className="ff-bottom-nav bg-dark-900/95 backdrop-blur-xl border-t border-dark-800 px-2 pb-2 pt-1 safe-area-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-forge-400'
                  : 'text-dark-500 hover:text-dark-300'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-forge-400' : 'text-dark-500'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
