/**
 * FocusForge Shield Action Extension
 *
 * Handles button taps on the shield screen.
 * Primary button: Sends a local notification with deep link to open FocusForge,
 *   writes a flag to shared UserDefaults, and closes the shield.
 * Secondary button: Closes the shield.
 *
 * Note: Apple does not provide a public API to open the parent app directly
 * from a ShieldActionExtension. The local notification is the recommended workaround.
 * Users must tap the notification banner to open FocusForge.
 */

import Foundation
import ManagedSettings
import UserNotifications

class ShieldActionExtension: ShieldActionDelegate {

  // App Group suite name — must match what the main app uses
  private let suiteName = "group.org.focusforge.app"
  private let unlockRequestKey = "focusforge_shield_unlock_requested"

  override func handle(action: ShieldAction,
                       for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handleAction(action, completionHandler: completionHandler)
  }

  override func handle(action: ShieldAction,
                       for webDomain: WebDomainToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handleAction(action, completionHandler: completionHandler)
  }

  override func handle(action: ShieldAction,
                       for category: ActivityCategoryToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    handleAction(action, completionHandler: completionHandler)
  }

  private func handleAction(_ action: ShieldAction,
                             completionHandler: @escaping (ShieldActionResponse) -> Void) {
    switch action {
    case .primaryButtonPressed:
      // Write a flag so the main app shows the unlock screen
      if let defaults = UserDefaults(suiteName: suiteName) {
        defaults.set(true, forKey: unlockRequestKey)
        defaults.set(Date().timeIntervalSince1970, forKey: "\(unlockRequestKey)_ts")
      }
      // Send a local notification to open FocusForge
      sendOpenAppNotification()
      // .close dismisses the shield and sends user to home screen
      // User must tap the notification to open FocusForge
      completionHandler(.close)
    case .secondaryButtonPressed:
      completionHandler(.close)
    @unknown default:
      completionHandler(.close)
    }
  }

  private func sendOpenAppNotification() {
    let content = UNMutableNotificationContent()
    content.title = "📱 Open FocusForge"
    content.body = "Tap here to review your tasks and daily goals."
    content.sound = .default
    // Deep link to block screen
    content.userInfo = ["deepLink": "focusforge://block"]

    let request = UNNotificationRequest(
      identifier: "focusforge-shield-unlock-\(UUID().uuidString)",
      content: content,
      trigger: nil // Deliver immediately
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        print("[FocusForge] Failed to send notification: \(error.localizedDescription)")
      }
    }
  }
}
