import { NativeModules, Platform } from 'react-native';

const { AppBlockerModule } = NativeModules;

const AppBlocker = {
  /**
   * Check if the Accessibility Service permission is granted
   * @returns {Promise<boolean>}
   */
  checkPermission: async () => {
    if (Platform.OS !== 'android') {
      console.warn('AppBlocker is only available on Android');
      return false;
    }
    try {
      return await AppBlockerModule.checkPermission();
    } catch (error) {
      console.error('AppBlocker.checkPermission error:', error);
      return false;
    }
  },

  /**
   * Open Android Accessibility Settings so the user can enable the service
   * @returns {Promise<boolean>}
   */
  requestPermission: async () => {
    if (Platform.OS !== 'android') {
      console.warn('AppBlocker is only available on Android');
      return false;
    }
    try {
      return await AppBlockerModule.requestPermission();
    } catch (error) {
      console.error('AppBlocker.requestPermission error:', error);
      return false;
    }
  },

  /**
   * Update the list of blocked app package names
   * @param {string[]} packageNames - Array of Android package names to block
   * @returns {Promise<boolean>}
   */
  updateBlockedApps: async (packageNames) => {
    if (Platform.OS !== 'android') {
      console.warn('AppBlocker is only available on Android');
      return false;
    }
    try {
      return await AppBlockerModule.updateBlockedApps(packageNames);
    } catch (error) {
      console.error('AppBlocker.updateBlockedApps error:', error);
      return false;
    }
  },

  /**
   * Check if the AccessibilityService is currently running
   * @returns {Promise<boolean>}
   */
  isServiceRunning: async () => {
    if (Platform.OS !== 'android') {
      return false;
    }
    try {
      return await AppBlockerModule.isServiceRunning();
    } catch (error) {
      console.error('AppBlocker.isServiceRunning error:', error);
      return false;
    }
  },

  /**
   * Get list of installed apps on the device
   * @returns {Promise<Array<{name: string, package: string, isSystem: boolean}>>}
   */
  getInstalledApps: async () => {
    if (Platform.OS !== 'android') {
      return [];
    }
    try {
      return await AppBlockerModule.getInstalledApps();
    } catch (error) {
      console.error('AppBlocker.getInstalledApps error:', error);
      return [];
    }
  },
};

export default AppBlocker;
