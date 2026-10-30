/**
 * FocusForge Screen Time Module
 * 
 * This module bridges to the native iOS Screen Time API (FamilyControls).
 * On Android, it bridges to the AccessibilityService-based app blocker.
 * 
 * IMPORTANT: The iOS Screen Time API requires Apple's FamilyControls entitlement.
 * You must apply for this entitlement at developer.apple.com before the iOS
 * blocking features will work. Without it, the module will return mock responses.
 * 
 * Usage from the web app (via the bridge):
 *   window.FocusForgeNative.blockApp('com.instagram.android')
 *   window.FocusForgeNative.unblockApp('com.instagram.android')
 *   window.FocusForgeNative.getBlockedApps()
 *   window.FocusForgeNative.requestPermissions()
 *   window.FocusForgeNative.checkPermissions()
 */

import { NativeModules, Platform } from 'react-native';

const { ScreenTimeModule, AppBlockerModule } = NativeModules;

class ScreenTimeManager {
  constructor() {
    this.isIOS = Platform.OS === 'ios';
    this.isAndroid = Platform.OS === 'android';
    this.nativeModule = this.isIOS ? ScreenTimeModule : AppBlockerModule;
  }

  get isAvailable() {
    return !!this.nativeModule;
  }

  async requestPermissions() {
    if (!this.nativeModule) {
      console.warn('[ScreenTime] Native module not available');
      return false;
    }
    try {
      return await this.nativeModule.requestPermissions();
    } catch (error) {
      console.error('[ScreenTime] Permission request failed:', error);
      return false;
    }
  }

  async checkPermissions() {
    if (!this.nativeModule) return false;
    try {
      return await this.nativeModule.checkPermissions();
    } catch (error) {
      console.error('[ScreenTime] Permission check failed:', error);
      return false;
    }
  }

  async blockApp(bundleId) {
    if (!this.nativeModule) {
      console.warn('[ScreenTime] Native module not available, cannot block:', bundleId);
      return false;
    }
    try {
      return await this.nativeModule.blockApp(bundleId);
    } catch (error) {
      console.error('[ScreenTime] Block app failed:', error);
      return false;
    }
  }

  async unblockApp(bundleId) {
    if (!this.nativeModule) return false;
    try {
      return await this.nativeModule.unblockApp(bundleId);
    } catch (error) {
      console.error('[ScreenTime] Unblock app failed:', error);
      return false;
    }
  }

  async getBlockedApps() {
    if (!this.nativeModule) return [];
    try {
      return await this.nativeModule.getBlockedApps();
    } catch (error) {
      console.error('[ScreenTime] Get blocked apps failed:', error);
      return [];
    }
  }
}

export default new ScreenTimeManager();
