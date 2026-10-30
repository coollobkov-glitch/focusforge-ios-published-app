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

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    guard activity.rawValue == "focusforge.reblock" else { return }
    // The 15-minute snooze window is over — reapply the shield.
    reapplyShields()
    DeviceActivityCenter().stopMonitoring([activity])
  }

  private func reapplyShields() {
    let defaults = UserDefaults(suiteName: Self.suiteName)
    guard let data = defaults?.data(forKey: Self.selectionKey) else { return }

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
