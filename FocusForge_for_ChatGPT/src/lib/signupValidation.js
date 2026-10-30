export function getSignupErrors({ name, email, password, intention }) {
  const errors = []
  if (!name.trim()) errors.push('Enter your name.')
  if (!email.trim()) errors.push('Enter your email address.')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Enter a valid email address.')
  if (!password.trim()) errors.push('Enter a password.')
  else if (password.trim().length < 6) errors.push('Your password needs at least 6 characters.')
  if (!intention.trim()) errors.push('Write your intention.')
  return errors
}
