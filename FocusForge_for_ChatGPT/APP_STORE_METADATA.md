# FocusForge App Store metadata draft

Use this as a starting point for App Store Connect. Verify current Apple field limits before submitting.

## Basic information

- App name: `FocusForge`
- Subtitle: `Focus tools & app blocker`
- Bundle ID: `org.focusforge.app`
- SKU: `focusforge-ios`
- Primary category: `Productivity`
- Secondary category: `Lifestyle`
- Version: `1.0.0`
- Build: `1`
- Privacy Policy URL: `https://focus-forge.app/privacy`
- Support URL: `https://focus-forge.app/support`
- Marketing URL: `https://focus-forge.app`
- Terms URL, if requested: `https://focus-forge.app/terms`

## Keywords

```text
focus,app blocker,screen time,distraction,habits,tasks,streaks,deep work,digital detox
```

## Promotional text

```text
Block distractions, protect your focus, and build daily momentum with tasks, habits, streaks, and Screen Time controls.
```

## Description

```text
FocusForge helps you protect your attention and build consistent daily focus.

Choose the apps and categories that distract you, then use Apple Screen Time controls to shield them while you work. Track tasks, habits, focus sessions, distraction attempts, streaks, and daily progress in one place.

Features:

• Block distracting apps and categories with Apple Screen Time
• Create tasks and habits that support your goals
• Track focus sessions and daily progress
• View analytics for streaks, focus, and distractions
• Use temporary access when you intentionally need a blocked app
• Turn on strict mode to reduce bypassing
• Keep tasks, habits, and progress available offline on your device
• Restore your subscription across devices with your Apple ID

FocusForge Pro unlocks the full experience with an auto-renewing Apple subscription. Subscriptions are billed through your Apple ID and can be managed or canceled in Apple ID settings.

FocusForge is a productivity tool and does not provide medical or mental-health treatment.
```

## App Review notes draft

```text
FocusForge uses Apple Family Controls, ManagedSettings, DeviceActivity, and Screen Time APIs to let the user select distracting apps/categories and place shields on them.

Review steps:
1. Create a test account or use the provided demo account.
2. Complete onboarding.
3. Grant Screen Time/Family Controls permission when prompted.
4. Select one or more apps/categories.
5. Open a blocked app to see the FocusForge shield.
6. Test temporary access/snooze and strict mode.
7. Review tasks, habits, analytics, and settings.

Subscriptions are handled through Apple StoreKit and presented with Superwall. Restore Purchases is available on the subscription screen.

Deleting a FocusForge account removes the account and associated app data but does not cancel an Apple subscription; subscriptions remain managed by Apple.
```

Add the actual test-account email/password only in App Store Connect’s private review-information field, not in public metadata or source files.

## App Privacy draft

Use the app’s `PrivacyInfo.xcprivacy` and privacy policy as the source of truth.

Likely collected data, linked to the user and not used for tracking:

- Name
- Email address
- User ID
- Device ID
- Other user content: focus intention stored in the Supabase account profile. Tasks, habits, progress, and blocking preferences remain on the device and are not the reason for this disclosure.
- Product interaction: Superwall app/paywall/subscription events. Focus sessions, streaks, distraction attempts, and daily progress remain on the device.
- Purchase history: subscription/entitlement status through Apple/Superwall

Likely purposes:

- App functionality
- Product personalization where applicable
- Analytics for user-facing progress/usage analytics
- No third-party advertising
- No tracking as defined by Apple App Tracking Transparency

Confirm these answers against the App Store Connect privacy questionnaire before submission.

## Age rating draft

Verified in App Store Connect on October 8, 2026: 9+ in 172 countries/regions, with regional exceptions and a legacy 4+ rating on operating systems earlier than version 26. Health/Wellness Topics is Yes because habit presets include hydration, sleep, and meditation; Medical/Treatment Information is None. No public user-generated content, social features, unrestricted browsing, gambling, mature/sexual content, or violence.

## Screenshot checklist

Capture the required iPhone sizes currently requested by App Store Connect. Suggested shots:

1. Welcome/onboarding hero
2. Dashboard/progress
3. Tasks and habits
4. Focus session
5. Analytics/streaks
6. Screen Time app blocking/paywall
7. Settings/account controls
8. Blocked-app screen, if allowed/capturable

Verify whether App Store Connect requires separate iPad screenshots. The Xcode target currently has `TARGETED_DEVICE_FAMILY = 1`, which is iPhone-only, even though it can run on iPad in compatibility mode.

## Upload checklist

- Confirm the IPA was exported for App Store Connect.
- Confirm version `1.0.0` and build `1`.
- Confirm all embedded extensions are present.
- Upload via Xcode Organizer or Apple Transporter.
- Wait for processing.
- Resolve any App Store Connect compliance warnings.
- Add screenshots and metadata.
- Answer export-compliance/encryption questions.
- Add review notes and test credentials.
- Save, review everything, then ask the user for explicit confirmation before Submit for Review.
