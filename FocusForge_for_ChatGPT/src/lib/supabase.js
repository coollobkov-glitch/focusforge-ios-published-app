import { createClient } from '@supabase/supabase-js'
import { getDeviceId, getDeviceName } from './deviceId'

import { supabaseUrl, supabaseAnonKey, emailConfirmationUrl } from './authConfig'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getAuthErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const message = error?.message || ''
  if (error?.code === 'over_email_send_rate_limit' || message.toLowerCase().includes('email rate limit exceeded')) {
    return 'Too many account emails were requested. Please wait about an hour and try again.'
  }
  return message || fallback
}

export const auth = {
  async checkEmailExists(email) {
    try {
      // Check if a user with this email exists in the users table
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (error) {
        console.error('Email check error:', error)
        return false
      }
      
      // If data exists, email is taken
      return !!data
    } catch (e) {
      console.error('Email check error:', e)
      return false
    }
  },

  async signUp(email, password, name, intention) {
    // 1. Create auth user with redirect URL for email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: emailConfirmationUrl,
      },
    })
    
    if (authError) throw authError
    if (!authData.user) throw new Error('No user returned from signup')
    
    // Detect duplicate email — Supabase returns empty identities for existing emails
    if (authData.user.identities && authData.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Please log in instead.')
    }
    
    // Check if email confirmation is needed (no session = needs confirmation)
    const needsEmailConfirmation = !authData.session
    
    // 2. Create user profile with device info
    const deviceId = getDeviceId()
    const deviceName = getDeviceName()
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        auth_id: authData.user.id,
        email,
        name,
        intention,
        active_device_id: deviceId,
        last_active_device_name: deviceName,
        last_active_at: new Date().toISOString(),
      }])
      .select()
      .single()
    
    if (userError) throw userError
    
    return { authUser: authData.user, user: userData, needsEmailConfirmation }
  },

  // Returns the users-table profile for an auth user, creating it if the
  // original signup insert never landed (an orphaned auth account can
  // otherwise never sign in — the profile select fails with "Cannot coerce
  // the result to a single JSON object").
  async ensureProfile(authUser) {
    const { data: existing, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (error) throw error
    if (existing) return existing

    const deviceId = getDeviceId()
    const deviceName = getDeviceName()
    // name/intention are NOT NULL on the users table — a repaired profile
    // has no onboarding answers, so derive something sensible from the
    // account and let the user edit it later in Settings.
    const { data: created, error: createError } = await supabase
      .from('users')
      .insert([{
        auth_id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        intention: authUser.user_metadata?.intention || '',
        active_device_id: deviceId,
        last_active_device_name: deviceName,
        last_active_at: new Date().toISOString(),
      }])
      .select()
      .single()

    // A row that exists but wasn't readable (RLS timing, etc.) produces a
    // unique-violation on insert — just select it again in that case.
    if (createError?.code === '23505') {
      const { data: row, error: refetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .maybeSingle()
      if (refetchError) throw refetchError
      if (row) return row
    }
    if (createError) throw createError
    return created
  },

  async signIn(email, password) {
    // 1. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (authError) throw authError
    if (!authData.user) throw new Error('No user returned from login')
    
    // 2. Get user profile, repairing it if a previous signup left none
    const userData = await auth.ensureProfile(authData.user)
    
    // 3. Update device info (this logs out other devices)
    const deviceId = getDeviceId()
    const deviceName = getDeviceName()
    
    await supabase
      .from('users')
      .update({
        active_device_id: deviceId,
        last_active_device_name: deviceName,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', userData.id)
    
    return { authUser: authData.user, user: { ...userData, active_device_id: deviceId } }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async deleteAccount() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('You must be signed in to delete your account.')

    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (error) {
      let message = error.message || 'Account deletion could not be completed'
      try {
        const body = await error.context?.json()
        if (body?.error) message = body.error
      } catch {}
      throw new Error(message)
    }
    if (!data?.success) throw new Error(data?.error || 'Account deletion could not be completed')
    await supabase.auth.signOut().catch(() => {})
  },

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  async checkDeviceSession(userId) {
    const deviceId = getDeviceId()
    
    const { data, error } = await supabase
      .from('users')
      .select('active_device_id')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    
    // Return true if this device is the active one
    return data.active_device_id === deviceId
  },
}

export const db = {
  async getUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getTasks(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createTask(taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateTask(taskId, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    
    if (error) throw error
  },

  async getHabits(userId) {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async createHabit(habitData) {
    const { data, error } = await supabase
      .from('habits')
      .insert([habitData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateHabit(habitId, updates) {
    const { data, error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', habitId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteHabit(habitId) {
    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', habitId)
    
    if (error) throw error
  },

  async getBlockedApps(userId) {
    const { data, error } = await supabase
      .from('blocked_apps')
      .select('*')
      .eq('user_id', userId)
    
    if (error) throw error
    return data || []
  },

  async createBlockedApp(appData) {
    const { data, error } = await supabase
      .from('blocked_apps')
      .insert([appData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateBlockedApp(appId, updates) {
    const { data, error } = await supabase
      .from('blocked_apps')
      .update(updates)
      .eq('id', appId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
}
