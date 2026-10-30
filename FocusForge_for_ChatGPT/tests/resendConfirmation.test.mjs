import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

function harness(resend) {
  const setters = [], state = []
  const hooks = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useEffect() {}, useRef: value => ({ current: value }),
    useState(value) { const index = state.length; state.push(value); setters.push(v => state[index] = v); return [value, setters[index]] },
  }
  const source = fs.readFileSync(new URL('../src/screens/ResendConfirmation.jsx', import.meta.url), 'utf8')
    .replace(/^import .*\n/gm, '')
    .replace('export default function', 'function')
  const code = transformSync(source, { loader: 'jsx' }).code
  const context = { React: hooks, ...hooks, supabase: { auth: { resend } }, emailConfirmationUrl: 'https://focus-forge.app/auth/confirm/', Date, setTimeout, clearTimeout }
  vm.createContext(context)
  vm.runInContext(code + '\nthis.Component = ResendConfirmation', context)
  const tree = context.Component({ email: ' demo@example.com ' })
  return { click: tree.children[0].props.onClick, state }
}

test('resend requests a new signup email, trims the address and prevents duplicate taps', async () => {
  let calls = 0, finish, args
  const h = harness(input => { calls++; args = input; return new Promise(resolve => finish = resolve) })
  const first = h.click()
  assert.equal(h.state[0], true)
  await h.click()
  assert.equal(calls, 1)
  assert.equal(args.type, 'signup')
  assert.equal(args.email, 'demo@example.com')
  assert.equal(args.options.emailRedirectTo, 'https://focus-forge.app/auth/confirm/')
  finish({ error: null }); await first
  assert.equal(h.state[0], false)
  assert.equal(h.state[1], 60)
  assert.match(h.state[2], /newest message/)
  await h.click(); assert.equal(calls, 1)
})

test('rate limits show a cooldown and do not claim email success', async () => {
  const h = harness(async () => ({ error: { status: 429 } }))
  await h.click()
  assert.equal(h.state[1], 60)
  assert.match(h.state[2], /wait/)
  assert.doesNotMatch(h.state[2], /requested/)
})

test('connection failure leaves retry available', async () => {
  const h = harness(async () => { throw Error('offline') })
  await h.click()
  assert.equal(h.state[0], false)
  assert.equal(h.state[1], 0)
  assert.match(h.state[2], /connection/)
})
