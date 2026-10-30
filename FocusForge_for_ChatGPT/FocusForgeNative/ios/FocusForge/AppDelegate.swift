internal import Expo
import React
import UserNotifications
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // iOS snapshots the screen right before backgrounding and reuses that image
  // during the resume/unsuspend animation and in the app switcher. Without
  // this overlay, that snapshot is whatever tab was last on screen — so
  // tapping the shield notification showed the old tab for a moment before
  // our own JS could route to the block screen. Covering the screen before
  // the snapshot is taken makes it blank instead.
  private var privacyOverlay: UIView?

  // Set the instant the shield notification is tapped — before the app is even
  // active. While true, the cover is held up no matter what, because the
  // WebView is still showing whatever tab was open last. It is only lowered
  // once JS reports the block screen has actually rendered.
  private var pendingBlockNavigation = false

  private func showPrivacyOverlay() {
    guard let window = self.window, privacyOverlay == nil else { return }
    let overlay = UIView(frame: window.bounds)
    overlay.backgroundColor = UIColor(red: 3.0/255, green: 7.0/255, blue: 18.0/255, alpha: 1)
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(overlay)
    privacyOverlay = overlay
  }

  private func hidePrivacyOverlay() {
    privacyOverlay?.removeFromSuperview()
    privacyOverlay = nil
  }

  /// Called from ScreenTimeModule when the shield notification is tapped.
  @objc func markPendingBlockNavigation() {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.pendingBlockNavigation = true
      self.showPrivacyOverlay()
      // Safety net: never leave the cover up forever if JS fails to report in.
      // Kept short — this is a failure path, not the normal one, and a long
      // fallback here is exactly what made a missed signal feel like a hang.
      DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
        guard let self = self, self.pendingBlockNavigation else { return }
        self.pendingBlockNavigation = false
        self.hidePrivacyOverlay()
      }
    }
  }

  /// Called from ScreenTimeModule once the web app has rendered the block
  /// screen, so we know it is safe to reveal the WebView.
  @objc func clearPendingBlockNavigation() {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      self.pendingBlockNavigation = false
      self.hidePrivacyOverlay()
    }
  }

  @objc func consumePendingBlockNavigation() -> Bool {
    let pending = pendingBlockNavigation
    return pending
  }

  public override func applicationWillResignActive(_ application: UIApplication) {
    super.applicationWillResignActive(application)
    showPrivacyOverlay()
  }

  public override func applicationDidEnterBackground(_ application: UIApplication) {
    super.applicationDidEnterBackground(application)
    showPrivacyOverlay()
  }

  public override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    // A block navigation is in flight — keep the cover up until the web app
    // confirms the block screen is on screen (clearPendingBlockNavigation).
    if pendingBlockNavigation { return }
    // Normal resume: nothing is changing underneath, so reveal immediately.
    hidePrivacyOverlay()
  }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    // Set up notification delegate for deep linking from shield
    UNUserNotificationCenter.current().delegate = self
    // Request notification permission so the shield "Open FocusForge" notification appears
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if let error = error {
        print("[FocusForge] Notification permission error: \(error.localizedDescription)")
      } else {
        print("[FocusForge] Notification permission granted: \(granted)")
      }
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  // MARK: - UNUserNotificationCenterDelegate
  
  // Handle notification when app is in foreground
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    // Show the notification even when app is in foreground
    completionHandler([.banner, .sound])
  }
  
  // Handle notification tap
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    
    // Check for deep link in notification
    if let deepLink = userInfo["deepLink"] as? String,
       let url = URL(string: deepLink) {
      // Raise the cover NOW, before the app becomes active, so the resume
      // animation and the stale WebView content are both hidden.
      markPendingBlockNavigation()
      // Open the deep link URL
      DispatchQueue.main.async {
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
      }
    }
    
    completionHandler()
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
