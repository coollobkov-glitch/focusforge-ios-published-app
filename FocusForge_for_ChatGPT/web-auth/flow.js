const allowedTypes = new Set(['recovery', 'signup', 'email', 'email_change', 'magiclink', 'invite'])
export function readEmailLink(urlString) {
  const url = new URL(urlString)
  const hash = new URLSearchParams(url.hash.slice(1))
  const get = key => hash.get(key) || url.searchParams.get(key)
  if (get('error')) throw new Error('This email link has expired or has already been used. Please request a new link.')
  const type = get('type')
  const tokenHash = get('token_hash')
  const accessToken = get('access_token')
  const refreshToken = get('refresh_token')
  if (!allowedTypes.has(type) || !(tokenHash || (accessToken && refreshToken))) {
    throw new Error('Open the newest confirmation or password reset link from your email. If it no longer works, request a new link.')
  }
  return { type, tokenHash, accessToken, refreshToken }
}
export function passwordError(password, confirmation) {
  if (!password || !confirmation) return 'Please fill in both password fields.'
  if (password.length < 6) return 'Your password must contain at least 6 characters.'
  if (password !== confirmation) return 'The passwords do not match. Please enter the same password in both fields.'
  return ''
}
export async function verifyEmailLink(client, link) {
  const result = link.tokenHash
    ? await client.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
    : await client.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
  if (result.error) throw result.error
  if (!result.data?.session) throw new Error('This link could not be verified. Please request a new link.')
  // Verify with the auth server rather than trusting URL claims or stored state.
  const user = await client.auth.getUser()
  if (user.error || !user.data?.user) throw user.error || new Error('This email link is no longer valid.')
  return { recovery: link.type === 'recovery' }
}

export async function requestFreshEmailLink(client, { email, confirmation, redirectTo }) {
  return confirmation
    ? client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } })
    : client.auth.resetPasswordForEmail(email, { redirectTo })
}
