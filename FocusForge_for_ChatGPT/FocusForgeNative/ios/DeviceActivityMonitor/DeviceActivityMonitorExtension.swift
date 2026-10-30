/**
 * FocusForge Device Activity Monitor Extension
 *
 * Runs in the background (outside the main app process) so the shield can be
 * reapplied after a temporary "snooze" unblock even while the user is in
 * another app or the device is locked.
 *
 * The snooze window is exactly 15 minutes, matching Apple's minimum
 * DeviceActivitySchedule interval. When the interval ends, iOS launches this
 * extension and calls `intervalDidEnd`, where we synchronously reapply the
 * shield from the selection stored in the shared App Group. No polling needed —
 * this is Apple's intended usage pattern and is far more reliable than the
 * sub-15-minute workaround.
 */

import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

class DeviceActivityMonitorExtension: DeviceActivityMonitor {

  private let store = ManagedSettingsStore()
  private static let suiteName = "group.org.focusforge.app"
  private static let selectionKey = "focusforge.selection.data"
  private static let activeAccountKey = "focusforge.active_account_id"
  private static let reblockTargetKey = "focusforge.reblock.target"

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    guard activity.rawValue == "focusforge.reblock" else { return }

    let defaults = UserDefaults(suiteName: Self.suiteName)
    let snoozeUntil = defaults?.double(forKey: Self.reblockTargetKey) ?? 0

    // iOS can invoke this callback before the wall-clock end of the snooze
    // window (notably when the schedule's interval starts at the current
    // instant, which iOS considers already in progress). Re-shielding here
    // unconditionally is what cancelled the snooze moments after it began, so
    // the shared timestamp — not this callback — is authoritative.
    if snoozeUntil > Date().timeIntervalSince1970 { return }

    reapplyShields()
    defaults?.removeObject(forKey: Self.reblockTargetKey)
    DeviceActivityCenter().stopMonitoring([activity])
  }

  /// Ends a grant as soon as its usage allowance is spent.
  ///
  /// `intervalDidEnd` can't do this for short grants: a DeviceActivitySchedule
  /// has a 15-minute minimum, so a 60-second "continue anyway" has no interval
  /// to end. A threshold event measures time actually spent in the shielded
  /// apps and fires here in the background, which is what lets the shield return
  /// while the user is still inside Instagram rather than waiting for them to
  /// reopen FocusForge.
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name,
                                       activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    guard activity.rawValue == "focusforge.grant" else { return }

    reapplyShields()
    // Clear the shared window too, or the main app would still consider the
    // snooze active and skip its own reapply paths.
    UserDefaults(suiteName: Self.suiteName)?.removeObject(forKey: Self.reblockTargetKey)
    DeviceActivityCenter().stopMonitoring([activity])
  }

  private func reapplyShields() {
    let defaults = UserDefaults(suiteName: Self.suiteName)
    let accountId = defaults?.string(forKey: Self.activeAccountKey)?
      .trimmingCharacters(in: .whitespacesAndNewlines)
    let scopedKey = "\(Self.selectionKey).\(accountId?.isEmpty == false ? accountId! : "guest")"

    // Before the web app has reported an active account, keep supporting the
    // old unscoped key so an upgrade does not silently drop an existing shield.
    let storageKey: String
    if accountId?.isEmpty == false {
      storageKey = scopedKey
    } else if defaults?.data(forKey: Self.selectionKey) != nil {
      storageKey = Self.selectionKey
    } else {
      storageKey = scopedKey
    }

    guard let data = defaults?.data(forKey: storageKey) else { return }

    let decoder = JSONDecoder()
    guard let selection = try? decoder.decode(FamilyActivitySelection.self, from: data) else {
      return
    }

    if selection.applicationTokens.isEmpty {
      store.shield.applications = nil
    } else {
      store.shield.applications = selection.applicationTokens
    }
    if selection.categoryTokens.isEmpty {
      store.shield.applicationCategories = nil
    } else {
      store.shield.applicationCategories = .specific(selection.categoryTokens)
    }
  }
}
