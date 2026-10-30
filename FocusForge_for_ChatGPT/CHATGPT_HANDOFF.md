# FocusForge ChatGPT handoff

You are taking over development and release preparation for **FocusForge**, a native iOS focus/distraction-blocking app built as a React/Vite web app embedded in a React Native/Expo WebView.

This folder is a working duplicate of the original project. It contains the app source, native iOS source, configs, latest generated web bundles, public legal/support pages, and the exported App Store IPA. Dependency and build-cache folders were intentionally excluded so ChatGPT can inspect/edit a manageable copy.

## Goal

Finish preparing FocusForge for Apple App Store submission. The app has already been tested on a physical iPad. The remaining work is mostly release polish, public URL deployment/verification, screenshots, App Store Connect metadata, upload/validation, and final submission only after the user explicitly approves.

## Important constraints

- Do **not** submit the app for App Review without explicit user confirmation.
- Do **not** ask for or expose secrets. Supabase service-role keys, Resend API keys, SMTP passwords, Apple credentials, and App Store Connect keys are not included and should remain private.
- The Superwall key in `FocusForgeNative/App.js` is a public iOS client key and is intentionally embedded in the app.
- Do not commit or request `.env`, `.p8`, `.p12`, or provisioning/private-key files.
- The app must remain functional offline using bundled `index.html` and `block.html` assets.

## Project identity

- App name: `FocusForge`
- Bundle ID: `org.focusforge.app`
- Team ID: `XKQ2SMQBHH`
- URL scheme: `focusforge://`
- Version: `1.0.0`
- Build number: `1`
- iOS deployment target: `16.0`
- Supabase project URL: `https://gghltmvurqwwwvflxnaw.supabase.co`
- Website domain: `https://focus-forge.app`

## Folder structure

- `src/` — React/Vite FocusForge web app.
- `src/store/useStore.js` — Zustand state and account-scoped local persistence.
- `src/screens/` — onboarding, login, dashboard, analytics, settings, reset password, block screen.
- `src/lib/nativeBridge.js` — web/native bridge API.
- `FocusForgeNative/App.js` — React Native wrapper and Superwall setup.
- `FocusForgeNative/src/bridge/NativeBridge.js` — bridge message routing.
- `FocusForgeNative/ios/FocusForge/ScreenTimeModule.swift` — Screen Time/Family Controls native module.
- `FocusForgeNative/ios/DeviceActivityMonitor/` — background shield/reblock extension.
- `FocusForgeNative/ios/ShieldAction/` and `ShieldConfiguration/` — Screen Time extensions.
- `public/` — public static files and newly added Privacy, Terms, and Support pages.
- `dist/` — generated production `index.html` plus public legal/support files.
- `dist-block/` — generated production block-screen bundle.
- `supabase/functions/delete-account/` — account deletion Edge Function.
- `FocusForgeNative/FocusForge-AppStore-Export/` — successful App Store export including `FocusForge.ipa`.

## What was intentionally excluded

To keep the handoff small, these generated folders were not copied:

- `node_modules/`
- `FocusForgeNative/node_modules/`
- `FocusForgeNative/ios/Pods/`
- Xcode `build/` and `DerivedData/`
- old `.xcarchive` archives

The final exported IPA is included. If dependencies must be reinstalled, run the install commands in the original project or ask the user for the original full folder.

## Completed work and history

### Account isolation

The biggest recent fix was cross-account data leakage. Previously, logging into a different FocusForge account still showed the previous account’s tasks, habits, blocked apps, and progress.

Implemented behavior:

- Local web-app data is now namespaced by Supabase `user.id` using keys like:
  - `focusforge_tasks:<user-id>`
  - `focusforge_habits:<user-id>`
  - `focusforge_blocked_apps:<user-id>`
  - `focusforge_daily_stats:<user-id>`
- Active account pointer remains `focusforge_user_id`.
- Logging out preserves each account’s cache but removes the active-account pointer.
- Signing in loads a complete account snapshot and replaces the prior in-memory state.
- Account deletion clears only the deleted account’s local namespace.
- Native iOS `FamilyActivitySelection` and Screen Time state are also account-scoped.
- Logging out switches native Screen Time state to a guest namespace without deleting the prior account’s saved selection.
- The user tested this on the iPad and confirmed it works.

### Account deletion

- Settings → Delete Account calls the Supabase `delete-account` Edge Function.
- The function deletes the Supabase Auth user and associated profile/data.
- The app clears only the deleted account’s local data.
- The user confirmed a disposable account could be deleted and recreated with the same email.

### Supabase auth/email

- Supabase Site URL was set to `https://focus-forge.app`.
- Redirect URLs include:
  - `https://focus-forge.app`
  - `focusforge://auth/callback`
  - `focusforge://auth/reset`
- Resend is connected to Supabase for production SMTP.
- Resend domain `focus-forge.app` was verified through Netlify DNS.
- Sender is `FocusForge <no-reply@focus-forge.app>`.
- Password-reset and confirmation emails are working.
- Reset wording was corrected to avoid claiming an email exists for unknown addresses.

### Native blocking

- Screen Time/Family Controls permission and shielding were tested.
- Block-screen snooze, temporary access, strict mode, and reblocking were tested.
- The native module and Device Activity extension were updated for account-scoped shield state.

### Subscription

- Subscription purchases are tied to the Apple ID, not the FocusForge email account.
- Multiple FocusForge accounts can share one Apple subscription.
- Purchase restoration was tested on device.
- No plan-gate flash occurs when a subscription is active.

### Public legal/support pages

New files were added under `public/`:

- `public/privacy.html`
- `public/terms.html`
- `public/support.html`
- `public/legal.css`
- `public/_redirects`

The `_redirects` file maps:

- `/privacy` → `privacy.html`
- `/terms` → `terms.html`
- `/support` → `support.html`
- all other paths → `index.html`

The full build now succeeds. `scripts/sites-build.mjs` was updated to skip optional `.openai/hosting.json` packaging when that file is absent.

### App Store package

A Release archive was created, then exported for App Store Connect. The export succeeded and produced:

- `FocusForgeNative/FocusForge-AppStore-Export/FocusForge.ipa`
- `FocusForgeNative/FocusForge-AppStore-Export/DistributionSummary.plist`
- `FocusForgeNative/FocusForge-AppStore-Export/ExportOptions.plist`

The export summary indicates cloud-managed Apple Distribution signing. The exported app includes all required Screen Time extension profiles and `get-task-allow=false`.

The bundled web files in the archive were compared to the latest production output and matched:

- `dist/index.html`
- `dist-block/block.html`

## Remaining work

1. Deploy or verify the public pages on Netlify:
   - `https://focus-forge.app/privacy`
   - `https://focus-forge.app/terms`
   - `https://focus-forge.app/support`
2. Capture App Store screenshots.
3. Enter App Store Connect metadata from `APP_STORE_METADATA.md`.
4. Complete App Privacy answers consistently with `PrivacyInfo.xcprivacy` and the privacy policy.
5. Verify App Store Connect subscription products and Superwall product/placement IDs.
6. Upload `FocusForge.ipa` using Xcode Organizer or Apple Transporter.
7. Add the uploaded build to the app version.
8. Add App Review notes and test-account credentials if required.
9. Run Apple validation and fix any warnings/errors.
10. Only after the user explicitly approves, click Submit for Review.

## Build commands

From the project root:

```bash
npm run build
```

That generates:

- `dist/index.html`
- `dist-block/block.html`

Copy them into the native bundled web assets before a native build:

```bash
cp dist/index.html FocusForgeNative/assets/webapp/index.html
cp dist-block/block.html FocusForgeNative/assets/webapp/block.html
```

From `FocusForgeNative/`:

```bash
xcodebuild \
  -workspace ios/FocusForge.xcworkspace \
  -scheme FocusForge \
  -configuration Release \
  -destination generic/platform=iOS \
  -allowProvisioningUpdates \
  -archivePath FocusForge-AppStore.xcarchive \
  archive
```

Export only, without submitting:

```bash
xcodebuild \
  -exportArchive \
  -archivePath FocusForge-AppStore.xcarchive \
  -exportPath FocusForge-AppStore-Export \
  -exportOptionsPlist /path/to/ExportOptions.plist \
  -allowProvisioningUpdates
```

## Important caution

This duplicate excludes dependency folders, so do not assume it can build immediately until dependencies are restored. For code review and metadata work, this copy is enough. For a full rebuild, either reinstall dependencies or return to the original project folder.
