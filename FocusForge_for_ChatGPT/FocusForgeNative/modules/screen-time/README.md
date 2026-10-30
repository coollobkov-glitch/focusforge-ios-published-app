# FocusForge Screen Time Module

## Architecture

```
FocusForgeNative/
├── App.js                          # WebView wrapper + bridge injection
├── src/
│   └── bridge/
│       └── NativeBridge.js         # Routes messages from WebView → native
├── modules/
│   └── screen-time/
│       ├── index.js                # JS interface for the native module
│       ├── swift/                  # iOS native files (add to Xcode after prebuild)
│       │   ├── ScreenTimeModule.swift          # Main blocking logic
│       │   ├── ScreenTimeModuleBridge.m        # Obj-C bridge for React Native
│       │   └── ShieldConfiguration.swift       # Blocking overlay UI
│       └── README.md               # This file
```

## How It Works

1. **Web App** runs inside a WebView
2. Web app calls `window.FocusForgeNative.blockApp('com.instagram')` 
3. **NativeBridge** receives the message and routes it to the native module
4. **ScreenTimeModule (Swift)** uses Apple's FamilyControls to block the app
5. When user opens a blocked app, **ShieldConfiguration** shows the FocusForge overlay

## iOS Setup (after Apple approves your FamilyControls entitlement)

### 1. Apply for Apple's FamilyControls Entitlement
- Go to developer.apple.com → Account → Identifiers
- Select your App ID (com.focusforge.app)
- Enable "FamilyControls" capability
- Submit the entitlement request form

### 2. Run Expo Prebuild
```bash
npx expo prebuild --platform ios
```

### 3. Add Swift Files to Xcode
Open the generated `ios/` project in Xcode and:
1. Drag the files from `modules/screen-time/swift/` into your project
2. Make sure they're added to the main target

### 4. Add Required Frameworks
In Xcode → Your Target → General → Frameworks:
- FamilyControls.framework
- DeviceActivity.framework
- ManagedSettings.framework
- ManagedSettingsUI.framework

### 5. Add Shield Configuration Extension
In Xcode: File → New → Target → Shield Configuration Extension
- Copy the code from `ShieldConfiguration.swift` into the extension

### 6. Add Entitlements
In your `.entitlements` file, add:
```xml
<key>com.apple.developer.family-controls</key>
<true/>
```

### 7. Build and Test
```bash
npx expo run:ios --device
```
Note: Screen Time API does NOT work in the simulator. You must test on a real device.

## Android Setup

### 1. Run Expo Prebuild
```bash
npx expo prebuild --platform android
```

### 2. Add AccessibilityService
The Android native module will be created separately in:
`android/app/src/main/java/com/focusforge/app/AppBlockerModule.kt`

### 3. Required Permissions
- `PACKAGE_USAGE_STATS` — detect which app is in foreground
- `SYSTEM_ALERT_WINDOW` — show overlay on top of blocked apps
- `AccessibilityService` — detect app launches

## Communication Flow

```
Web App (JavaScript)
    ↓ window.FocusForgeNative.blockApp()
    ↓ postMessage via WebView
Native Bridge (React Native JS)
    ↓ NativeBridge.handleMessage()
    ↓ calls native module
ScreenTimeModule (Swift) / AppBlockerModule (Kotlin)
    ↓ uses OS APIs
iOS: FamilyControls shield    /    Android: Overlay + AccessibilityService
```
