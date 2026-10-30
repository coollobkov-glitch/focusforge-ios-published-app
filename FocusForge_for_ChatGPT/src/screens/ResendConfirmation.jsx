import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { emailConfirmationUrl } from '../lib/authConfig'

export default function ResendConfirmation({ email }) {
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const nextAllowed = useRef(0)

  useEffect(() => {
    if (!remaining) return
    const timer = setTimeout(() => setRemaining(Math.max(0, Math.ceil((nextAllowed.current - Date.now()) / 1000))), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  async function resend() {
    if (busy.current || Date.now() < nextAllowed.current) return
    busy.current = true
    setSending(true)
    setMessage('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup', email: email.trim(), options: { emailRedirectTo: emailConfirmationUrl },
      })
      if (error) throw error
      nextAllowed.current = Date.now() + 60000
      setRemaining(60)
      setMessage('New confirmation email requested. Open the newest message and use its link.')
    } catch (error) {
      if (error?.status === 429 || error?.code === 'over_email_send_rate_limit') {
        nextAllowed.current = Date.now() + 60000
        setRemaining(60)
        setMessage('Please wait before requesting another email. If the limit continues, try again later.')
      } else {
        setMessage('Could not send the email. Check your connection and try again.')
      }
    } finally {
      busy.current = false
      setSending(false)
    }
  }

  return (
    <div className="w-full text-center mb-3">
      <button type="button" onClick={resend} disabled={sending || remaining > 0 || !email.trim()}
        className="min-h-11 px-4 py-2 text-sm text-forge-400 border border-forge-500/30 rounded-xl disabled:opacity-60">
        {sending ? 'Sending…' : remaining > 0 ? `Send again in ${remaining}s` : 'Send another confirmation email'}
      </button>
      {message && <p role="status" className="text-dark-400 text-xs mt-2">{message}</p>}
    </div>
  )
}
