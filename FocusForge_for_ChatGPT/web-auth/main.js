import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey, passwordResetUrl, emailConfirmationUrl } from '../src/lib/authConfig.js'
import { readEmailLink, verifyEmailLink, passwordError, requestFreshEmailLink } from './flow.js'
import './style.css'

const byId = id => document.getElementById(id)
// Keep recovery tokens in memory, never localStorage, and do not auto-consume URL state.
const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } })
const confirmationPage = window.location.pathname.startsWith('/auth/confirm')
byId('request').textContent = confirmationPage ? 'Send a new confirmation link' : 'Send a new reset link'
const requestDescription = confirmationPage
  ? 'Enter your email to receive a fresh confirmation link. Open the newest message, even if your inbox groups it with earlier emails.'
  : 'Enter your email to receive a fresh password reset link.'
let verifiedRecovery = false
const showError = message => { byId('error').textContent = message; byId('error').hidden = false }
const clearError = () => { byId('error').textContent = ''; byId('error').hidden = true }
const finish = (title, description) => {
  verifiedRecovery = false
  byId('title').textContent = title
  byId('description').textContent = description
  byId('password-form').hidden = true
  byId('request-form').hidden = true
  byId('done').hidden = false
  byId('password').value = ''
  byId('confirmation').value = ''
}
async function start() {
  let link
  try { link = readEmailLink(window.location.href) } catch (error) {
    byId('title').textContent = 'Need a new email link?'
    byId('description').textContent = requestDescription
    showError(error.message)
    byId('request-form').hidden = false
  } finally {
    // Remove credentials from browser history before rendering forms or links.
    window.history.replaceState(null, '', window.location.pathname)
  }
  if (!link) return
  try {
    const result = await verifyEmailLink(client, link)
    if (result.recovery) {
      verifiedRecovery = true
      byId('title').textContent = 'Set your new password'
      byId('description').textContent = 'Save your new password here, then return to FocusForge and sign in.'
      byId('password-form').hidden = false
    } else {
      await client.auth.signOut({ scope: 'local' })
      finish('Email confirmed', 'Your email link has been verified. Open FocusForge and sign in to continue.')
    }
  } catch {
    byId('title').textContent = 'This link is no longer valid'
    byId('description').textContent = requestDescription
    showError('The link may have expired or already been used. Please request a new one.')
    byId('request-form').hidden = false
  }
}
byId('password-form').addEventListener('submit', async event => {
  event.preventDefault(); clearError()
  if (!verifiedRecovery) { showError('Please open a valid password reset link from your email.'); return }
  const password = byId('password').value
  const issue = passwordError(password, byId('confirmation').value)
  if (issue) { showError(issue); return }
  byId('save').disabled = true
  try {
    const { error } = await client.auth.updateUser({ password })
    if (error) throw error
    // Leave the web recovery session; password change is already complete.
    await client.auth.signOut({ scope: 'local' }).catch(() => {})
    finish('Password updated', 'Your new password is saved. Return to FocusForge and sign in with it.')
  } catch (error) {
    showError(error.message || 'Your password could not be saved. Please try again or request a new link.')
  } finally { byId('save').disabled = false }
})
byId('request-form').addEventListener('submit', async event => {
  event.preventDefault(); clearError()
  const email = byId('email').value.trim()
  if (!email || !byId('email').validity.valid) { showError('Please enter a valid email address.'); return }
  byId('request').disabled = true
  try {
    const { error } = await requestFreshEmailLink(client, { email, confirmation: confirmationPage, redirectTo: confirmationPage ? emailConfirmationUrl : passwordResetUrl })
    if (error) throw error
    byId('title').textContent = 'Check your email'
    byId('description').textContent = confirmationPage ? 'If this account needs confirmation, a fresh link has been sent. Open the newest message in your inbox, then return to FocusForge.' : 'If an account exists for this email address, a new reset link has been sent. Open the newest link to continue.'
    byId('request-form').hidden = true
  } catch (error) { showError(error.code === 'over_email_send_rate_limit' ? 'Too many emails were requested. Please wait before trying again.' : 'The email could not be sent. Please try again later.') }
  finally { byId('request').disabled = false }
})
start()
