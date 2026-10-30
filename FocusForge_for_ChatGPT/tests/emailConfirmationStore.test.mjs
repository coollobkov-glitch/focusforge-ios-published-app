import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { create } from 'zustand'
import { watchEmailConfirmation } from '../src/lib/emailConfirmationWatcher.js'

test('pending signup remains locked until authentication succeeds, preserving setup', async () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: k => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: k => values.delete(k),
  }
  globalThis.window = { location: { search: '' } }
  let verified = false
  const profile = { id: 'test-profile', email: 'signup@example.test', name: 'Test User' }
  // Exercise the actual store with an isolated auth boundary. Never contact
  // production Supabase or create an email/account from this test.
  globalThis.confirmationStoreTest = {
    create,
    auth: {
      signUp: async () => ({ user: profile, needsEmailConfirmation: true }),
      signIn: async () => {
        if (!verified) throw { code: 'email_not_confirmed' }
        return { user: profile }
      },
    },
    db: {},
    setActiveAccountOnNative: async () => {},
    syncBlockedAppsToNative: () => {},
  }
  let source = await readFile(new URL('../src/store/useStore.js', import.meta.url), 'utf8')
  source = source.replace(/^import .+$/gm, '')
  source = 'const { create, auth, db, setActiveAccountOnNative, syncBlockedAppsToNative } = globalThis.confirmationStoreTest;\n' + source
  const loadStore = async (suffix) => (await import(`data:text/javascript;base64,${Buffer.from(source + `\n// ${suffix}`).toString('base64')}`)).default
  try {
    const store = await loadStore('signup')
    await store.getState().completeOnboarding({
      ...profile, password: 'test-only-password', intention: 'Finish my work',
      tasks: [{ title: 'Task one', taskType: 'primary' }],
      habits: [{ title: 'Read', icon: '📚', color: '#fff' }], blockedApps: [],
    })
    assert.equal(store.getState().hasOnboarded, false)
    assert.equal(store.getState().awaitingEmailConfirmation, true)
    assert.equal((await loadStore('reload-before-confirmation')).getState().hasOnboarded, false)
    await assert.rejects(store.getState().signIn(profile.email, 'test-only-password', { background: true }))
    assert.equal(store.getState().hasOnboarded, false)
    assert.equal(store.getState().isLoading, false)
    verified = true // Represents the confirmation completed on a different device.
    let stop
    await new Promise((resolve, reject) => {
      stop = watchEmailConfirmation({
        check: async () => {
          try { await store.getState().signIn(profile.email, 'test-only-password', { background: true }); resolve() }
          catch (error) { reject(error); throw error }
        },
        windowTarget: new EventTarget(), documentTarget: new EventTarget(),
      })
    })
    stop()
    assert.equal(store.getState().hasOnboarded, true)
    assert.equal(store.getState().awaitingEmailConfirmation, false)
    assert.equal(store.getState().tasks[0].title, 'Task one')
    assert.equal(store.getState().habits[0].title, 'Read')
    assert.equal(store.getState().user.intention, 'Finish my work')
    assert.equal(localStorage.getItem('focusforge_pending_email_confirmation'), null)
    assert.ok(![...values.values()].some(value => value.includes('test-only-password')))
  } finally {
    delete globalThis.confirmationStoreTest
    delete globalThis.window
    delete globalThis.localStorage
  }
})
