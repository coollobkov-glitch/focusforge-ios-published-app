# FocusForge

Source backup of the published FocusForge iOS app, captured October 29, 2026.

- App Store: https://apps.apple.com/us/app/focus-forge/id6812922316
- Website: https://focus-forge.app
- Bundle identifier: `org.focusforge.app`
- Published version: 1.0.0 (build 11)

## Contents

- `FocusForge_for_ChatGPT/`: React/Vite app, authentication website, native React Native/Expo wrapper, iOS Xcode project, Screen Time extensions, tests, and Supabase account-deletion function.
- `FocusForge_for_ChatGPT/FocusForgeNative/assets/webapp/`: bundled web app used by the native app for offline operation.
- `marketing/app-store/`: the four published App Store screenshots, in display order.

`CHATGPT_HANDOFF.md` within the app directory is historical development context; use this README and the current configuration for release identity.

## Web preview

Requires Node.js and npm.

```sh
cd FocusForge_for_ChatGPT
npm ci
npm run dev -- --host 127.0.0.1
```

## Web build and tests

```sh
cd FocusForge_for_ChatGPT
node --test tests/*.test.mjs
npm run build
```

When updating the embedded app, copy the built `dist/index.html` and `dist-block/block.html` into `FocusForgeNative/assets/webapp/` before building iOS.

## Native development

Requires macOS, Xcode, CocoaPods, and the appropriate Apple Developer signing access.

```sh
cd FocusForge_for_ChatGPT/FocusForgeNative
npm ci
cd ios
pod install
open FocusForge.xcworkspace
```

Select the FocusForge scheme in Xcode. Physical-device Screen Time features require Apple-approved Family Controls distribution entitlements for the app and extensions. Purchases use the existing App Store Connect and Superwall configuration.

## Backup scope

This repository backs up source, project configuration, bundled web assets, and published screenshot artwork. Dependency caches, signing credentials, environment secrets, build archives, exported IPAs, private review information, local logs, and database records are excluded. Supabase, Superwall, Netlify, and App Store Connect account settings remain managed in those services and are not a database or account backup.

Public Supabase anonymous client configuration and the public Superwall SDK key are intentionally part of the client application; administrative service-role keys and private credentials must never be added.
