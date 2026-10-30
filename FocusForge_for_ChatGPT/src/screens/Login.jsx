import React, { useState } from 'react'
import { Mail, Lock, AlertCircle, Loader, ArrowLeft } from 'lucide-react'
import useStore from '../store/useStore'
import { supabase, getAuthErrorMessage } from '../lib/supabase'
import { ForgeWordmark } from './ForgeBrand'
import ResendConfirmation from './ResendConfirmation'
import { passwordResetUrl } from '../lib/authConfig'

export default function Login({ onSignup }) {
  const { signIn } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setConfirmationEmail('')
    
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Invalid email or password'))
      if (err?.code === 'email_not_confirmed' || err?.message?.toLowerCase() === 'email not confirmed') setConfirmationEmail(email.trim())
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!resetEmail || !resetEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: passwordResetUrl,
      })
      
      if (error) throw error
      
      setResetSent(true)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Failed to send reset email'))
    } finally {
      setResetLoading(false)
    }
  }

  // Show forgot password screen
  if (showForgotPassword) {
    return (
      <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col px-5 pt-20 pb-8 overflow-y-auto">
        {/* Back Button */}
        <button
          onClick={() => {
            setShowForgotPassword(false)
            setResetSent(false)
            setError('')
          }}
          className="flex items-center gap-2 text-dark-400 hover:text-dark-300 transition-colors mb-6"
        >
          <ArrowLeft size={18} />
          Back to login
        </button>

        <div className="flex items-center gap-3 mb-7">
          <ForgeWordmark compact />
        </div>

        {/* Header */}
        <div className="mb-8">
          <span className="ff-kicker">ACCOUNT RECOVERY</span>
          <h1 className="ff-title text-3xl mt-2 mb-2">Reset Password</h1>
          <p className="text-dark-400">
            {resetSent 
              ? "Check your email for a password reset link"
              : "Enter your email and we'll send you a reset link"
            }
          </p>
        </div>

        {/* Success Message */}
        {resetSent ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-green-400 font-semibold mb-1">Request Sent</h3>
                <p className="text-dark-300 text-sm">
                  If an account exists for <span className="text-white font-medium">{resetEmail}</span>, a password reset link has been sent.
                  Open the newest email link to set your password on the FocusForge website. Then return to the app and sign in with your new password.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Reset Form */}
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-forge-500 focus:border-transparent"
                    disabled={resetLoading}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    )
  }

  // Show login screen
  return (
    <div className="ff-screen h-full w-full max-w-md mx-auto bg-dark-950 flex flex-col px-5 pt-20 pb-8 overflow-y-auto">
      {/* Brand */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <ForgeWordmark compact />
        </div>
        <span className="ff-kicker">WELCOME BACK</span>
        <h1 className="ff-title text-3xl mt-2 mb-2">Return to your discipline.</h1>
        <p className="text-dark-400">Sign in and keep building momentum.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {confirmationEmail && confirmationEmail === email.trim() && (
        <ResendConfirmation key={confirmationEmail} email={confirmationEmail} />
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4 mb-6">
        <div>
          <label className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2 block">
            Email
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-forge-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2 block">
            Password
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-forge-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-forge-600 to-forge-500 text-white font-semibold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={18} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Sign Up Link */}
      <button
        onClick={onSignup}
        className="w-full bg-dark-900 border border-dark-700 text-dark-200 font-semibold py-3.5 rounded-xl hover:border-forge-500 transition-colors mb-4"
      >
        Create a New Account
      </button>

      {/* Forgot Password */}
      <button 
        onClick={() => setShowForgotPassword(true)}
        className="text-dark-400 text-sm hover:text-dark-300 transition-colors"
      >
        Forgot password?
      </button>

      {/* Divider */}
      <div className="h-8 flex-shrink-0" />
    </div>
  )
}
