import React from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { ForgeMark, ForgeWordmark } from './ForgeBrand'

export default function Welcome({ onLogin, onSignup }) {
  return (
    <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col items-center justify-center px-6">
      {/* FocusForge identity */}
      <div className="mb-9 text-center">
        <div className="ff-logo-stage mb-5"><ForgeMark size={82} /></div>
        <div className="flex justify-center mb-4"><ForgeWordmark /></div>
        <h1 className="ff-title text-3xl text-center mb-2">Forge stronger focus.</h1>
        <p className="text-dark-400 text-center text-sm leading-relaxed">
          Turn distractions into discipline.<br />Build momentum that lasts.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="space-y-3 mb-12 w-full">
        <div className="flex items-center gap-3 text-dark-300">
          <div className="w-8 h-8 rounded-lg bg-forge-600/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🎯</span>
          </div>
          <p className="text-sm">Set daily goals and track your progress</p>
        </div>
        <div className="flex items-center gap-3 text-dark-300">
          <div className="w-8 h-8 rounded-lg bg-forge-600/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🚫</span>
          </div>
          <p className="text-sm">Block distracting apps when you need focus</p>
        </div>
        <div className="flex items-center gap-3 text-dark-300">
          <div className="w-8 h-8 rounded-lg bg-forge-600/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">📊</span>
          </div>
          <p className="text-sm">Build streaks and see your discipline grow</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full space-y-3">
        <button
          onClick={onSignup}
          className="w-full bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-forge-600/20"
        >
          <UserPlus size={20} />
          Create Account
        </button>

        <button
          onClick={onLogin}
          className="w-full bg-dark-900 border border-dark-700 text-dark-200 font-medium py-4 rounded-2xl flex items-center justify-center gap-2 hover:border-dark-600 transition-colors"
        >
          <LogIn size={20} />
          Log In
        </button>
      </div>

      <p className="text-dark-600 text-xs text-center mt-8">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
