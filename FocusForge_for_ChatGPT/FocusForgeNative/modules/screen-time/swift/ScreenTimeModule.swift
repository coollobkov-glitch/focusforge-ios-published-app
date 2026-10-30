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
  private static let reblockTargetKey = "focusforge.reblock.target"
  private static let reblockActivityName = DeviceActivityName("focusforge.reblock")

  override init() {
    super.init()
    // Restore the persisted selection so shields can be reapplied after a
    // cold start (e.g. reboot / app relaunch).
    if let saved = Self.loadSelection() {
      lastSelection = saved
    }
  }

  // MARK: - Shared selection persistence

  private static func loadSelection() -> FamilyActivitySelection? {
    guard let defaults = UserDefaults(suiteName: suiteName),
          let data = defaults.data(forKey: selectionKey) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  private func persistSelection(_ selection: FamilyActivitySelection) {
    guard let defaults = UserDefaults(suiteName: Self.suiteName) else { return }
    if let data = try? JSONEncoder().encode(selection) {
      defaults.set(data, forKey: Self.selectionKey)
    }
  }

  // MARK: - Persistence (counts only)

  private func loadCounts() -> (applications: Int, categories: Int) {
    let defaults = UserDefaults.standard
    let apps = defaults.integer(forKey: "\(Self.countsKey)_apps")
    let cats = defaults.integer(forKey: "\(Self.countsKey)_cats")
    return (apps, cats)
  }

  private func saveCounts(apps: Int, categories: Int) {
    let defaults = UserDefaults.standard
    defaults.set(apps, forKey: "\(Self.countsKey)_apps")
    defaults.set(categories, forKey: "\(Self.countsKey)_cats")
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
    saveCounts(apps: 0, categories: 0)
    resolve(true)
  }

  @objc
  func reapplyBlocks(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    // ManagedSettingsStore shields are managed by the OS and normally persist
    // on their own. Reapply the in-memory selection if we have one.
    applyShields(selection: lastSelection)
    resolve(true)
  }

  // MARK: - Temporary Unblock

  private var reblockTimer: Timer?

  @objc
  func temporaryUnblock(_ minutes: Double,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Remove shields temporarily
    store.shield.applications = nil
    store.shield.applicationCategories = nil

    // Persist the reblock target time + selection so the background monitor
    // extension can reapply the shield even while FocusForge is suspended.
    let seconds = minutes * 60.0
    let target = Date().timeIntervalSince1970 + seconds
    if let defaults = UserDefaults(suiteName: Self.suiteName) {
      defaults.set(target, forKey: Self.reblockTargetKey)
    }
    persistSelection(lastSelection)

    // Cancel any existing in-app timer (fast path when app stays foreground)
    reblockTimer?.invalidate()
    DispatchQueue.main.async { [weak self] in
      self?.reblockTimer = Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { [weak self] _ in
        guard let self = self else { return }
        self.applyShields(selection: self.lastSelection)
      }
    }

    // Schedule the background DeviceActivity monitor. iOS enforces a 15-minute
    // minimum interval, so we schedule the minimum window; the extension polls
    // and reapplies at the real `target` time.
    scheduleBackgroundReblock()

    resolve([
      "unblocked": true,
      "reblockAfterMinutes": minutes
    ])
  }

  private func scheduleBackgroundReblock() {
    let deviceCenter = DeviceActivityCenter()
    deviceCenter.stopMonitoring([Self.reblockActivityName])

    let now = Date()
    let cal = Calendar.current
    let startComps = cal.dateComponents([.hour, .minute, .second], from: now)
    let endDate = cal.date(byAdding: .minute, value: 15, to: now) ?? now
    let endComps = cal.dateComponents([.hour, .minute, .second], from: endDate)

    let schedule = DeviceActivitySchedule(
      intervalStart: startComps,
      intervalEnd: endComps,
      repeats: false
    )

    do {
      try deviceCenter.startMonitoring(Self.reblockActivityName, during: schedule)
    } catch {
      // Best-effort: if scheduling fails (e.g. entitlement/limit), we still
      // have the in-app timer + reapply-on-foreground as fallbacks.
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
