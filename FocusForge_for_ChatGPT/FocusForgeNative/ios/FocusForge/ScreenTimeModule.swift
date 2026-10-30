/**
 * FocusForge Screen Time Module — iOS Native
 *
 * Uses Apple's FamilyControls + ManagedSettings frameworks to shield apps
 * chosen by the user via FamilyActivityPicker.
 *
 * REQUIREMENTS:
 * - iOS 16+
 * - FamilyControls entitlement (com.apple.developer.family-controls)
 * - NSFamilyControlsUsageDescription in Info.plist
 *
 * Bridged to React Native via ScreenTimeModuleBridge.m.
 */

import Foundation
import React
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import UIKit

@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {

  // Determined by the native target, never by a web flag or user preference.
  // Physical-device and App Store builds cannot report simulator status.
  @objc func constantsToExport() -> [AnyHashable: Any] {
#if targetEnvironment(simulator)
    return ["isSimulator": true]
#else
    return ["isSimulator": false]
#endif
  }

  private let store = ManagedSettingsStore()
  private let center = AuthorizationCenter.shared

  // FamilyActivitySelection IS Codable (iOS 16+), so we persist it to a shared
  // App Group so the DeviceActivityMonitor extension can reapply the shield in
  // the background after a temporary snooze.
  private var lastSelection: FamilyActivitySelection = FamilyActivitySelection()
  private static let countsKey = "focusforge_blocked_counts_v1"

  // Shared App Group storage (also read by the DeviceActivityMonitor extension)
  private static let suiteName = "group.org.focusforge.app"
  private static let selectionKey = "focusforge.selection.data"
  private static let activeAccountKey = "focusforge.active_account_id"
  private static let reblockTargetKey = "focusforge.reblock.target"
  private static let reblockActivityName = DeviceActivityName("focusforge.reblock")

  // Usage-threshold reblock. A DeviceActivitySchedule can't be shorter than 15
  // minutes, so a short grant (the 60s "continue anyway") can't be ended by an
  // interval. A DeviceActivityEvent threshold can: it measures actual usage of
  // the shielded apps and fires `eventDidReachThreshold` in the extension, in
  // the background, while FocusForge is suspended. That is the only way the
  // shield comes back without the user reopening FocusForge.
  private static let grantActivityName = DeviceActivityName("focusforge.grant")
  private static let grantEventName = DeviceActivityEvent.Name("focusforge.grant.used")

  override init() {
    super.init()
    // Restore the persisted selection so shields can be reapplied after a
    // cold start (e.g. reboot / app relaunch).
    if let saved = Self.loadSelection() {
      lastSelection = saved
    }
  }

  // MARK: - Account-scoped shared persistence

  private static func normalizedAccountId(_ accountId: String?) -> String {
    let trimmed = (accountId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? "guest" : trimmed
  }

  private static func activeAccountId() -> String {
    let defaults = UserDefaults(suiteName: suiteName)
    return normalizedAccountId(defaults?.string(forKey: activeAccountKey))
  }

  private static func scopedSelectionKey(accountId: String? = nil) -> String {
    "\(selectionKey).\(normalizedAccountId(accountId ?? activeAccountId()))"
  }

  private static func scopedCountsKey(_ suffix: String, accountId: String? = nil) -> String {
    "\(countsKey).\(normalizedAccountId(accountId ?? activeAccountId()))_\(suffix)"
  }

  private static func loadSelection(accountId: String? = nil) -> FamilyActivitySelection? {
    guard let defaults = UserDefaults(suiteName: suiteName),
          let data = defaults.data(forKey: scopedSelectionKey(accountId: accountId)) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  private func persistSelection(_ selection: FamilyActivitySelection) {
    guard let defaults = UserDefaults(suiteName: Self.suiteName),
          let data = try? JSONEncoder().encode(selection) else { return }
    defaults.set(data, forKey: Self.scopedSelectionKey())
  }

  private static func migrateStoredSelectionIfNeeded(to accountId: String,
                                                     allowLegacyMigration: Bool) {
    guard let defaults = UserDefaults(suiteName: suiteName),
          accountId != "guest" else { return }

    if defaults.data(forKey: scopedSelectionKey(accountId: accountId)) == nil {
      // A selection made during onboarding before account creation belongs to
      // that new account. The old unscoped key is the pre-account-scoping
      // migration path and is claimed only by the first signed-in account.
      let guestKey = scopedSelectionKey(accountId: "guest")
      if let guestData = defaults.data(forKey: guestKey) {
        defaults.set(guestData, forKey: scopedSelectionKey(accountId: accountId))
        defaults.removeObject(forKey: guestKey)
      } else if allowLegacyMigration,
                let legacyData = defaults.data(forKey: selectionKey) {
        defaults.set(legacyData, forKey: scopedSelectionKey(accountId: accountId))
      }
    }
    // Once an account has been established, the old unscoped selection must not
    // remain available for a different account to claim later.
    defaults.removeObject(forKey: selectionKey)
  }

  private static func migrateStoredCountsIfNeeded(to accountId: String,
                                                  allowLegacyMigration: Bool) {
    guard accountId != "guest" else { return }
    let defaults = UserDefaults.standard
    for suffix in ["apps", "cats"] {
      let targetKey = scopedCountsKey(suffix, accountId: accountId)
      let guestKey = scopedCountsKey(suffix, accountId: "guest")
      let legacyKey = "\(countsKey)_\(suffix)"
      if defaults.object(forKey: targetKey) == nil {
        if let guestValue = defaults.object(forKey: guestKey) {
          defaults.set(guestValue, forKey: targetKey)
          defaults.removeObject(forKey: guestKey)
        } else if allowLegacyMigration,
                  let legacyValue = defaults.object(forKey: legacyKey) {
          defaults.set(legacyValue, forKey: targetKey)
        }
      }
      defaults.removeObject(forKey: legacyKey)
    }
  }

  // MARK: - Persistence (counts only)

  private func loadCounts(accountId: String? = nil) -> (applications: Int, categories: Int) {
    let defaults = UserDefaults.standard
    let apps = defaults.integer(forKey: Self.scopedCountsKey("apps", accountId: accountId))
    let cats = defaults.integer(forKey: Self.scopedCountsKey("cats", accountId: accountId))
    return (apps, cats)
  }

  private func saveCounts(apps: Int, categories: Int) {
    let defaults = UserDefaults.standard
    defaults.set(apps, forKey: Self.scopedCountsKey("apps"))
    defaults.set(categories, forKey: Self.scopedCountsKey("cats"))
  }

  // MARK: - Permissions

  @objc
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task { @MainActor in
      do {
        try await center.requestAuthorization(for: .individual)
        resolve(center.authorizationStatus == .approved)
      } catch {
        reject("PERMISSION_ERROR",
               "Failed to get Screen Time permission: \(error.localizedDescription)",
               error)
      }
    }
  }

  @objc
  func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(center.authorizationStatus == .approved)
  }

  // Switches the device-level Screen Time state to a FocusForge account.
  // Each account keeps its own opaque FamilyActivitySelection; signing out
  // switches to an empty guest namespace without deleting the signed-out
  // account's saved selection.
  @objc
  func setActiveAccount(_ accountId: String?,
                        allowLegacyMigration: Bool,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    let normalized = Self.normalizedAccountId(accountId)
    Self.migrateStoredSelectionIfNeeded(to: normalized, allowLegacyMigration: allowLegacyMigration)
    Self.migrateStoredCountsIfNeeded(to: normalized, allowLegacyMigration: allowLegacyMigration)
    UserDefaults(suiteName: Self.suiteName)?.set(normalized, forKey: Self.activeAccountKey)

    // A temporary grant belongs to the account that made it. Account changes
    // must re-shield immediately for the newly active account.
    endSnooze()
    reblockTimer?.invalidate()
    DeviceActivityCenter().stopMonitoring([Self.reblockActivityName, Self.grantActivityName])

    if normalized == "guest" {
      lastSelection = FamilyActivitySelection()
      persistSelection(lastSelection)
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      saveCounts(apps: 0, categories: 0)
    } else {
      lastSelection = Self.loadSelection(accountId: normalized) ?? FamilyActivitySelection()
      applyShields(selection: lastSelection)
    }

    let counts = loadCounts(accountId: normalized)
    resolve([
      "success": true,
      "accountId": normalized,
      "applicationsCount": counts.applications,
      "categoriesCount": counts.categories
    ])
  }

  // MARK: - Picker

  @objc
  func presentPicker(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      guard let rootVC = Self.topViewController() else {
        reject("NO_ROOT_VC", "No root view controller available", nil)
        return
      }

      if self.center.authorizationStatus != .approved {
        Task { @MainActor in
          do {
            try await self.center.requestAuthorization(for: .individual)
            if self.center.authorizationStatus == .approved {
              self.showPicker(from: rootVC, resolve: resolve, reject: reject)
            } else {
              reject("NOT_AUTHORIZED", "Screen Time authorization was not granted", nil)
            }
          } catch {
            reject("AUTH_FAILED", error.localizedDescription, error)
          }
        }
      } else {
        self.showPicker(from: rootVC, resolve: resolve, reject: reject)
      }
    }
  }

  private func showPicker(from presenter: UIViewController,
                          resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
    let initial = lastSelection
    let host = FamilyActivityPickerHostingController(
      initialSelection: initial,
      onDone: { [weak self] selection in
        guard let self = self else { return }
        self.lastSelection = selection
        // Explicitly choosing a block list overrides any snooze in flight,
        // otherwise a stale window would suppress the block the user just set.
        self.endSnooze()
        self.reblockTimer?.invalidate()
        DeviceActivityCenter().stopMonitoring([Self.reblockActivityName, Self.grantActivityName])
        self.applyShields(selection: selection)
        self.saveCounts(
          apps: Int(selection.applicationTokens.count),
          categories: Int(selection.categoryTokens.count)
        )
        resolve([
          "applicationsCount": selection.applicationTokens.count,
          "categoriesCount": selection.categoryTokens.count,
          "cancelled": false
        ])
      },
      onCancel: { [weak self] in
        guard let self = self else { return }
        let counts = self.loadCounts()
        resolve([
          "applicationsCount": counts.applications,
          "categoriesCount": counts.categories,
          "cancelled": true
        ])
      }
    )
    host.modalPresentationStyle = .formSheet
    presenter.present(host, animated: true)
  }

  // MARK: - Block Management

  @objc
  func getSelectionSummary(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    let counts = loadCounts()
    resolve([
      "applicationsCount": counts.applications,
      "categoriesCount": counts.categories,
      "isAuthorized": center.authorizationStatus == .approved
    ])
  }

  @objc
  func clearBlocks(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    store.shield.applications = nil
    store.shield.applicationCategories = nil
    lastSelection = FamilyActivitySelection()
    persistSelection(lastSelection)
    endSnooze()
    reblockTimer?.invalidate()
    DeviceActivityCenter().stopMonitoring([Self.reblockActivityName, Self.grantActivityName])
    saveCounts(apps: 0, categories: 0)
    resolve(true)
  }

  @objc
  func reapplyBlocks(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(enforceShieldsIfSnoozeExpired())
  }

  // MARK: - Snooze (temporary unblock)

  private var reblockTimer: Timer?

  /// Wall-clock instant the current snooze window closes. This value in the
  /// shared App Group is the SINGLE source of truth for "is a snooze active" —
  /// the main app, the in-app timer and the DeviceActivity monitor extension all
  /// consult it. Any shield-applying path that skips this check will cancel the
  /// user's snooze early.
  private var snoozeUntil: TimeInterval {
    UserDefaults(suiteName: Self.suiteName)?.double(forKey: Self.reblockTargetKey) ?? 0
  }

  private var isSnoozeActive: Bool {
    snoozeUntil > Date().timeIntervalSince1970
  }

  private func beginSnooze(seconds: TimeInterval) {
    guard let defaults = UserDefaults(suiteName: Self.suiteName) else { return }
    defaults.set(Date().timeIntervalSince1970 + seconds, forKey: Self.reblockTargetKey)
    // The shield action extension sets this when the user taps through Apple's
    // shield. Clear it so coming back to FocusForge mid-snooze doesn't re-present
    // the block screen.
    defaults.removeObject(forKey: "focusforge_shield_unlock_requested")
  }

  private func endSnooze() {
    UserDefaults(suiteName: Self.suiteName)?.removeObject(forKey: Self.reblockTargetKey)
  }

  /// Reapplies the shield ONLY when the snooze window has fully elapsed.
  /// Returns whether the shield was actually (re)applied.
  @discardableResult
  private func enforceShieldsIfSnoozeExpired() -> Bool {
    if isSnoozeActive { return false }
    if snoozeUntil > 0 { endSnooze() }
    applyShields(selection: lastSelection)
    return true
  }

  /// Lifts the shield for `minutes`, then launches `scheme` (e.g. "instagram://").
  ///
  /// This is one atomic native operation on purpose: doing the lift, the wait and
  /// the app launch from JavaScript raced the OS, because WebView timers get
  /// throttled and `Linking.openURL` could fire before Springboard had dropped
  /// the shield — which re-triggered it instantly.
  @objc
  func snooze(_ minutes: Double,
              scheme: String,
              resolver resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    let seconds = max(1.0, minutes) * 60.0

    // 1. Get the selection on disk BEFORE lifting, so the background monitor can
    //    always restore it even if we're killed mid-snooze.
    persistSelection(lastSelection)
    // 2. Open the window BEFORE clearing, so a concurrent reapply can't win.
    beginSnooze(seconds: seconds)

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }

      // 3. Lift the shield.
      self.store.shield.applications = nil
      self.store.shield.applicationCategories = nil

      // 4. Arm the background + in-app reblocks.
      //    The usage threshold is what actually ends a short grant while the
      //    user is inside the blocked app; the interval schedule below is only
      //    a 15-minute safety net, and the in-app timer only runs while
      //    FocusForge is foreground.
      self.scheduleUsageThresholdReblock(minutes: minutes)
      self.scheduleBackgroundReblock(minutes: minutes)
      self.reblockTimer?.invalidate()
      self.reblockTimer = Timer.scheduledTimer(withTimeInterval: seconds + 1,
                                               repeats: false) { [weak self] _ in
        self?.enforceShieldsIfSnoozeExpired()
      }

      // 5. Let Springboard actually drop the shield before launching the app.
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
        guard !scheme.isEmpty, let url = URL(string: scheme) else {
          resolve(["unblocked": true, "opened": false, "minutes": minutes])
          return
        }
        // Deliberately not gated on `canOpenURL`, which needs the scheme listed
        // in LSApplicationQueriesSchemes and silently reports false otherwise.
        UIApplication.shared.open(url, options: [:]) { success in
          resolve(["unblocked": true, "opened": success, "minutes": minutes])
        }
      }
    }
  }

  /// Re-shields once the user has actually spent `minutes` inside the grant.
  ///
  /// Unlike an interval schedule (15-minute floor, wall-clock based), a
  /// threshold event counts usage of the monitored apps and is delivered to the
  /// monitor extension in the background. So leaving FocusForge for Instagram no
  /// longer parks the reblock until FocusForge is reopened.
  ///
  /// The enclosing schedule still has to clear Apple's 15-minute minimum, so it
  /// spans a day; the threshold — not the interval — is what ends the grant.
  private func scheduleUsageThresholdReblock(minutes: Double) {
    let deviceCenter = DeviceActivityCenter()
    deviceCenter.stopMonitoring([Self.grantActivityName])

    // Nothing selected means nothing to measure or re-shield.
    guard !lastSelection.applicationTokens.isEmpty
            || !lastSelection.categoryTokens.isEmpty
            || !lastSelection.webDomainTokens.isEmpty else { return }

    let cal = Calendar.current
    let now = Date()
    guard let end = cal.date(byAdding: .hour, value: 23, to: now) else { return }

    let schedule = DeviceActivitySchedule(
      intervalStart: cal.dateComponents([.hour, .minute], from: now),
      intervalEnd: cal.dateComponents([.hour, .minute], from: end),
      repeats: false
    )

    // Minute granularity: thresholds below a minute are not reported reliably.
    let event = DeviceActivityEvent(
      applications: lastSelection.applicationTokens,
      categories: lastSelection.categoryTokens,
      webDomains: lastSelection.webDomainTokens,
      threshold: DateComponents(minute: max(1, Int(minutes.rounded())))
    )

    do {
      try deviceCenter.startMonitoring(
        Self.grantActivityName,
        during: schedule,
        events: [Self.grantEventName: event]
      )
    } catch {
      print("[FocusForge] grant threshold monitoring failed: \(error.localizedDescription)")
    }
  }

  /// Schedules the background reblock via DeviceActivity.
  ///
  /// `intervalStart` MUST be strictly in the future. A schedule starting at the
  /// current instant is treated by iOS as already in progress, so it invoked the
  /// monitor extension immediately — `intervalDidEnd` then fired and re-shielded
  /// the app seconds after the snooze began. Starting one minute out avoids that.
  ///
  /// Apple also enforces a 15-minute minimum interval, so the monitored window is
  /// clamped to 15 minutes. Shorter snoozes still expire on time because the
  /// authoritative `snoozeUntil` timestamp (not this schedule) decides when the
  /// shield may return; this is only the background safety net.
  private func scheduleBackgroundReblock(minutes: Double) {
    let deviceCenter = DeviceActivityCenter()
    deviceCenter.stopMonitoring([Self.reblockActivityName])

    let cal = Calendar.current
    let now = Date()
    let windowMinutes = max(15, Int(minutes.rounded()))

    guard let start = cal.date(byAdding: .minute, value: 1, to: now),
          let end = cal.date(byAdding: .minute, value: windowMinutes + 1, to: now) else { return }

    // Minute granularity only — the scheduler is not second-accurate and
    // including seconds makes firing unreliable.
    let schedule = DeviceActivitySchedule(
      intervalStart: cal.dateComponents([.hour, .minute], from: start),
      intervalEnd: cal.dateComponents([.hour, .minute], from: end),
      repeats: false
    )

    do {
      try deviceCenter.startMonitoring(Self.reblockActivityName, during: schedule)
    } catch {
      // Best-effort: the in-app timer and reapply-on-foreground remain as
      // fallbacks if scheduling fails (e.g. entitlement/limit).
      print("[FocusForge] startMonitoring failed: \(error.localizedDescription)")
    }
  }

  private func applyShields(selection: FamilyActivitySelection) {
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
    // Keep the shared copy in sync so the background monitor can reapply it.
    persistSelection(selection)
  }

  // MARK: - Helpers

  private static func topViewController(base: UIViewController? = nil) -> UIViewController? {
    let baseVC = base ?? UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
      .first
    if let nav = baseVC as? UINavigationController {
      return topViewController(base: nav.visibleViewController)
    }
    if let tab = baseVC as? UITabBarController, let selected = tab.selectedViewController {
      return topViewController(base: selected)
    }
    if let presented = baseVC?.presentedViewController {
      return topViewController(base: presented)
    }
    return baseVC
  }

  // MARK: - Block navigation handshake
  //
  // The cover raised on notification tap (AppDelegate) stays up until the web
  // app confirms the block screen is rendered. Timers were unreliable here:
  // any fixed delay either revealed the stale tab early or added dead time.

  @objc
  func isBlockNavigationPending(_ resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let delegate = UIApplication.shared.delegate as? AppDelegate
      resolve(["pending": delegate?.consumePendingBlockNavigation() ?? false])
    }
  }

  @objc
  func blockScreenReady(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      (UIApplication.shared.delegate as? AppDelegate)?.clearPendingBlockNavigation()
      resolve(["ok": true])
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }
}

// MARK: - Family Activity Picker UI

private class FamilyActivityPickerHostingController: UIViewController {
  private let initialSelection: FamilyActivitySelection
  private let onDone: (FamilyActivitySelection) -> Void
  private let onCancel: () -> Void
  private var resolved = false

  init(initialSelection: FamilyActivitySelection,
       onDone: @escaping (FamilyActivitySelection) -> Void,
       onCancel: @escaping () -> Void) {
    self.initialSelection = initialSelection
    self.onDone = onDone
    self.onCancel = onCancel
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    let pickerView = FamilyActivityPickerContainer(
      initialSelection: initialSelection,
      onDone: { [weak self] sel in
        guard let self = self, !self.resolved else { return }
        self.resolved = true
        self.dismiss(animated: true) { self.onDone(sel) }
      },
      onCancel: { [weak self] in
        guard let self = self, !self.resolved else { return }
        self.resolved = true
        self.dismiss(animated: true) { self.onCancel() }
      }
    )

    let host = UIHostingController(rootView: pickerView)
    addChild(host)
    host.view.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(host.view)
    NSLayoutConstraint.activate([
      host.view.topAnchor.constraint(equalTo: view.topAnchor),
      host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor)
    ])
    host.didMove(toParent: self)
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    // If the user swipes down without hitting Cancel/Done, treat as cancel.
    if isBeingDismissed && !resolved {
      resolved = true
      onCancel()
    }
  }
}

private struct FamilyActivityPickerContainer: View {
  @State private var selection: FamilyActivitySelection
  let onDone: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void

  init(initialSelection: FamilyActivitySelection,
       onDone: @escaping (FamilyActivitySelection) -> Void,
       onCancel: @escaping () -> Void) {
    self._selection = State(initialValue: initialSelection)
    self.onDone = onDone
    self.onCancel = onCancel
  }

  var body: some View {
    NavigationView {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Apps to Block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { onCancel() }
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") { onDone(selection) }
              .fontWeight(.semibold)
          }
        }
    }
    .navigationViewStyle(.stack)
  }
}
