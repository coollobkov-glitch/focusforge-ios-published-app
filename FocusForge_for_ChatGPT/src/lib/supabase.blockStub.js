// Stand-in for lib/supabase.js in the standalone block-screen build only
// (aliased in vite.block.config.js).
//
// The store imports `auth` at module scope, which drags the whole Supabase
// client into any bundle that touches the store. The block screen never
// authenticates or syncs — it reads and writes local data exclusively — so the
// real client is dead weight there, and a large chunk of startup parse time.
//
// `auth` is only ever reached from signIn/signUp, both of which require the
// login/onboarding screens that this bundle does not include. If either is
// somehow called here, fail loudly rather than silently doing nothing.

const unavailable = (name) => () => {
  throw new Error(
    `${name}() is unavailable on the standalone block screen. ` +
    `Account and sync flows only exist in the full app bundle.`
  )
}

export const auth = {
  checkEmailExists: unavailable('auth.checkEmailExists'),
  signUp: unavailable('auth.signUp'),
  signIn: unavailable('auth.signIn'),
}

// Same reasoning as `auth`: the store imports `db` at module scope. The block
// screen only ever writes local data, so these are never reached — but the
// symbol has to exist or the bundle fails to build.
export const db = {
  getUser: unavailable('db.getUser'),
  createUser: unavailable('db.createUser'),
  updateUser: unavailable('db.updateUser'),
}

export const supabase = null
