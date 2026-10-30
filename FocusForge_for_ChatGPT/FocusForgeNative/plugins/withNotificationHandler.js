/**
 * withNotificationHandler — Expo config plugin
 *
 * Adds UNUserNotificationCenterDelegate handling to the AppDelegate
 * so that tapping a notification opens the app with the deep link.
 */

const { withAppDelegate } = require('@expo/config-plugins');

function withNotificationHandler(config) {
  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Add UserNotifications import if not present
    if (!contents.includes('import UserNotifications')) {
      contents = contents.replace(
        'import React',
        'import React\nimport UserNotifications'
      );
    }

    // Add UNUserNotificationCenterDelegate conformance
    if (!contents.includes('UNUserNotificationCenterDelegate')) {
      // Find the AppDelegate class declaration and add the protocol
      contents = contents.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {'
      );
    }

    // Add notification center delegate setup + permission request in didFinishLaunchingWithOptions
    if (!contents.includes('UNUserNotificationCenter.current().delegate = self')) {
      contents = contents.replace(
        'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
        `// Set up notification delegate for deep linking from shield
    UNUserNotificationCenter.current().delegate = self
    // Request notification permission so the shield "Open FocusForge" notification appears
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if let error = error {
        print("[FocusForge] Notification permission error: \\(error.localizedDescription)")
      } else {
        print("[FocusForge] Notification permission granted: \\(granted)")
      }
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
      );
    }

    // Add the notification delegate methods if not present
    if (!contents.includes('userNotificationCenter(_ center: UNUserNotificationCenter')) {
      // Find the closing brace of AppDelegate class and add methods before it
      const classEndPattern = /^}[\s]*\n[\s]*class ReactNativeDelegate/m;
      const delegateMethods = `
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
      // Open the deep link URL
      DispatchQueue.main.async {
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
      }
    }
    
    completionHandler()
  }
}

class ReactNativeDelegate`;

      contents = contents.replace(classEndPattern, delegateMethods);
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withNotificationHandler;
