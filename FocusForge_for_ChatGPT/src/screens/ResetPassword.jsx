import React, { useState, useEffect } from 'react'
import { Lock, AlertCircle, Loader, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { setActiveAccountOnNative, syncBlockedAppsToNative } from '../lib/nativeBridge'
import useStore from '../store/useStore'
import { ForgeWordmark } from './ForgeBrand'

export default function ResetPassword() {
  const { loadUserData } = useStore()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      } else {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    }
    checkSession()
  }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess(true)

      // Wait 2 seconds then redirect to login. window.location.reload() is
      // used instead of href='/' because the bundled WebView runs on file://
      // where '/' resolves to the filesystem root.
      setTimeout(async () => {
        await supabase.auth.signOut()
        await setActiveAccountOnNative(null)
        await syncBlockedAppsToNative([])
        localStorage.removeItem('focusforge_user_id')
        window.location.reload()
      }, 2000)

    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!validSession && error) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col items-center justify-center px-5">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold mb-1">Invalid Link</h3>
              <p className="text-dark-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-forge-400 font-semibold hover:text-forge-300 transition-colors"
        >
          Back to Login
        </button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col items-center justify-center px-5">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h3 className="text-green-400 font-semibold text-xl mb-2">Password Reset!</h3>
          <p className="text-dark-300 text-sm">
            Your password has been successfully reset. Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col px-5 pt-20 pb-8">
      <div className="flex items-center gap-3 mb-8">
        <ForgeWordmark compact />
      </div>

      {/* Header */}
      <div className="mb-8">
        <span className="ff-kicker">SECURE YOUR ACCOUNT</span>
        <h1 className="ff-title text-3xl mt-2 mb-2">Set New Password</h1>
        <p className="text-dark-400">Choose a strong password for your account</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2 block">
            New Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-forge-500 focus:border-transparent"
              disabled={loading}
              autoFocus
            />
          </div>
          <p className="text-dark-500 text-xs mt-1.5">Must be at least 6 characters</p>
        </div>

        <div>
          <label className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2 block">
            Confirm Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-forge-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
        >
          {loading ? (
            <>
              <Loader size={18} className="animate-spin" />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  )
}
