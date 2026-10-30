/**
 * Native Bridge Helper — Web App Side
 * 
 * This file provides helper functions for the web app to communicate
 * with the native wrapper (FocusForgeNative) when running inside WebView.
 * 
 * When running in a regular browser, all methods return mock/no-op responses.
 */

export function isRunningInNativeApp() {
  return !!(window.FocusForgeNative && window.FocusForgeNative.isNative);
}

export function getNativePlatform() {
  if (!isRunningInNativeApp()) return 'web';
  return window.FocusForgeNative.platform; // 'ios' or 'android'
}

export async function nativeBlockApp(packageName) {
  if (!isRunningInNativeApp()) return { success: false, reason: 'not-native' };
  return await window.FocusForgeNative.blockApp(packageName);
}

export async function nativeUnblockApp(packageName) {
  if (!isRunningInNativeApp()) return { success: false, reason: 'not-native' };
  return await window.FocusForgeNative.unblockApp(packageName);
}

export async function nativeGetBlockedApps() {
  if (!isRunningInNativeApp()) return [];
  const result = await window.FocusForgeNative.getBlockedApps();
  return result.apps || [];
}

export async function nativeRequestPermissions() {
  if (!isRunningInNativeApp()) return false;
  const result = await window.FocusForgeNative.requestPermissions();
  return result.granted || false;
}

export async function nativeCheckPermissions() {
  if (!isRunningInNativeApp()) return false;
  const result = await window.FocusForgeNative.checkPermissions();
  return result.hasPermission || false;
}

// Sync blocked apps list to native module
export async function syncBlockedAppsToNative(blockedApps) {
  if (!isRunningInNativeApp()) return;
  try {
    const activeApps = blockedApps.filter(a => a.active).map(a => ({
      name: a.name,
      package: a.package,
    }));
    await window.FocusForgeNative.postMessage('syncBlockedApps', { apps: activeApps });
    console.log('Synced', activeApps.length, 'blocked apps to native');
  } catch (e) {
    console.error('Failed to sync blocked apps to native:', e);
  }
}

export async function setActiveAccountOnNative(userId, { allowLegacyMigration = false } = {}) {
  if (!isRunningInNativeApp() || getNativePlatform() !== 'ios') return;
  try {
    await window.FocusForgeNative.postMessage('setActiveAccount', {
      accountId: userId || null,
      allowLegacyMigration,
    });
  } catch (e) {
    console.error('Failed to set active FocusForge account natively:', e);
  }
}

// Listen for when the native bridge becomes available
export function onNativeReady(callback) {
  if (isRunningInNativeApp()) {
    callback();
  } else {
    window.addEventListener('focusforge-native-ready', callback, { once: true });
  }
}
