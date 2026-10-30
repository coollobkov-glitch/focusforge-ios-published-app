import test from 'node:test'
import assert from 'node:assert/strict'
import { watchEmailConfirmation } from '../src/lib/emailConfirmationWatcher.js'

const unconfirmed = () => Object.assign(new Error('Not confirmed'), { code: 'email_not_confirmed' })
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
function harness(check, onError = () => {}, onChecking = () => {}) {
  const win = new EventTarget()
  const doc = new EventTarget()
  doc.visibilityState = 'visible'
  let clock = 0
  let nextId = 0
  const timers = new Map()
  const stop = watchEmailConfirmation({
    check, onError, onChecking, windowTarget: win, documentTarget: doc, now: () => clock,
    schedule: (fn, ms) => { timers.set(++nextId, { fn, at: clock + ms }); return nextId },
    cancel: id => timers.delete(id),
  })
  return {
    stop, win, doc, timers,
    native(state) { const e = new Event('focusforge-app-state-change'); e.detail = { state }; win.dispatchEvent(e) },
    async advance(ms) {
      const end = clock + ms
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        clock = next[1].at
        timers.delete(next[0]); next[1].fn(); await flush()
      }
      clock = end
      await flush()
    },
  }
}

test('confirmation on another device is discovered without a redirect or reload', async () => {
  let confirmed = false, attempts = 0, signedIn = 0
  const h = harness(async () => {
    attempts++
    if (!confirmed) throw unconfirmed()
    signedIn++
  })
  await flush()
  assert.equal(signedIn, 0)
  confirmed = true
  await h.advance(5000)
  assert.equal(signedIn, 1)
  await h.advance(60000)
  assert.equal(attempts, 2)
  assert.equal(h.timers.size, 0)
  h.stop()
})

test('iOS background pauses checks; returning checks immediately', async () => {
  let confirmed = false, attempts = 0
  const h = harness(async () => { attempts++; if (!confirmed) throw unconfirmed() })
  await flush()
  h.native('background')
  await h.advance(120000)
  assert.equal(attempts, 1)
  confirmed = true
  h.native('active')
  await flush()
  assert.equal(attempts, 2)
  assert.equal(h.timers.size, 0)
  h.stop()
})

test('browser visibility and online events resume checks without overlapping requests', async () => {
  let attempts = 0, resolveCheck
  const h = harness(() => { attempts++; return new Promise(resolve => { resolveCheck = resolve }) })
  await h.advance(2000)
  h.win.dispatchEvent(new Event('focus'))
  h.win.dispatchEvent(new Event('online'))
  assert.equal(attempts, 1)
  resolveCheck()
  await flush()
  assert.equal(h.timers.size, 0)
  h.stop()
})

test('hidden document pauses polling and visibility return triggers a check', async () => {
  let attempts = 0
  const h = harness(async () => { attempts++; throw unconfirmed() })
  await flush()
  h.doc.visibilityState = 'hidden'
  h.doc.dispatchEvent(new Event('visibilitychange'))
  await h.advance(60000)
  assert.equal(attempts, 1)
  h.doc.visibilityState = 'visible'
  h.doc.dispatchEvent(new Event('visibilitychange'))
  await flush()
  assert.equal(attempts, 2)
  h.stop()
})

test('rate limits back off, and cancellation ignores an in-flight error', async () => {
  let attempts = 0, errorMessage = ''
  const h = harness(async () => { attempts++; throw { status: 429 } }, m => { errorMessage = m })
  await flush()
  await h.advance(5000)
  assert.equal(attempts, 1)
  await h.advance(5000)
  assert.equal(attempts, 2)
  assert.match(errorMessage, /retry/)
  h.stop()
  await h.advance(120000)
  assert.equal(attempts, 2)
  let rejectCheck, errors = 0
  const pending = harness(() => new Promise((_, reject) => { rejectCheck = reject }), () => errors++)
  pending.stop(); rejectCheck(unconfirmed()); await flush()
  assert.equal(errors, 0)
  assert.equal(pending.timers.size, 0)
})

test('changed credentials stop automatic attempts and offer manual login', async () => {
  let message = ''
  const h = harness(async () => { throw { code: 'invalid_credentials' } }, m => { message = m })
  await flush()
  assert.match(message, /Log In/)
  assert.equal(h.timers.size, 0)
  h.stop()
})

 test('returning before the next poll immediately shows checking feedback', async () => {
  const states = []
  let attempts = 0, rejectCheck
  const h = harness(() => { attempts++; return new Promise((_, reject) => { rejectCheck = reject }) }, () => {}, value => states.push(value))
  assert.deepEqual(states, [true])
  rejectCheck(unconfirmed()); await flush()
  assert.deepEqual(states, [true, false])
  h.native('background')
  await h.advance(2000)
  h.native('active')
  assert.equal(attempts, 2)
  assert.deepEqual(states, [true, false, true])
  h.stop()
  rejectCheck(unconfirmed()); await flush()
  assert.deepEqual(states, [true, false, true])
})
