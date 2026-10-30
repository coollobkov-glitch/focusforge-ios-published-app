import { Platform, NativeModules, Linking } from 'react-native';

/**
 * NativeBridge — Routes messages from the WebView to the correct native module.
 *
 * On iOS: Uses ScreenTimeModule (Swift) via FamilyActivityPicker + ManagedSettings.
 *   iOS blocking is opaque-token based: the user picks apps in Apple's picker
 *   and we shield the returned tokens. Individual bundle-id block/unblock is
 *   not supported by Apple; on iOS those calls become no-ops with a helpful
 *   message so the Android WebView code continues to work unchanged.
 *
 * On Android: Uses AppBlockerModule (Kotlin) via AccessibilityService.
 *
 * When native modules aren't available (development / web), falls back to mocks.
 */

const ScreenTimeModule = NativeModules.ScreenTimeModule || null;
const AppBlockerModule = NativeModules.AppBlockerModule || null;

// Superwall placements must be registered from a component inside
// SuperwallProvider, so App.js installs the registrar here on mount.
let placementRegistrar = null;
let purchaseRestorer = null;
let subscriptionStatusGetter = null;
export function setPlacementRegistrar(fn) {
  placementRegistrar = fn;
}
export function setPurchaseRestorer(fn) {
  purchaseRestorer = fn;
}
export function setSubscriptionStatusGetter(fn) {
  subscriptionStatusGetter = fn;
}

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

export const NativeBridge = {
  async handleMessage(message) {
    const { action, data, callbackId } = message;
    let result = { success: false, error: 'Unknown action' };

    try {
      switch (action) {
        // --------------------------------------------------------------
        // Permissions (Screen Time authorization on iOS, usage stats on Android)
        // --------------------------------------------------------------
        case 'requestPermissions': {
          if (isIOS && ScreenTimeModule) {
            const granted = await ScreenTimeModule.requestPermissions();
            result = { success: true, granted };
          } else if (isAndroid && AppBlockerModule) {
            const granted = await AppBlockerModule.requestPermissions();
            result = { success: true, granted };
          } else {
            result = { success: true, granted: true, mock: true };
          }
          break;
        }

        case 'checkPermissions': {
          if (isIOS && ScreenTimeModule) {
            const hasPermission = await ScreenTimeModule.checkPermissions();
            result = { success: true, hasPermission };
          } else if (isAndroid && AppBlockerModule) {
            const hasPermission = await AppBlockerModule.checkPermissions();
            result = { success: true, hasPermission };
          } else {
            result = { success: true, hasPermission: false, mock: true };
          }
          break;
        }

        // --------------------------------------------------------------
        // iOS-only: present the FamilyActivityPicker and shield selection
        // --------------------------------------------------------------
        case 'presentPicker': {
          if (isIOS && ScreenTimeModule) {
            const summary = await ScreenTimeModule.presentPicker();
            result = { success: true, ...summary };
          } else {
            result = {
              success: false,
              error: 'presentPicker is only available on iOS with Screen Time',
            };
          }
          break;
        }

        case 'getSelectionSummary': {
          if (isIOS && ScreenTimeModule) {
            const summary = await ScreenTimeModule.getSelectionSummary();
            result = { success: true, ...summary };
          } else {
            result = {
              success: true,
              applicationsCount: 0,
              categoriesCount: 0,
              isAuthorized: false,
              mock: true,
            };
          }
          break;
        }

        case 'setActiveAccount': {
          if (isIOS && ScreenTimeModule) {
            const account = await ScreenTimeModule.setActiveAccount(
              data?.accountId || null,
              data?.allowLegacyMigration === true
            );
            result = { success: true, ...account };
          } else {
            result = { success: true, noop: true };
          }
          break;
        }

        case 'clearBlocks': {
          if (isIOS && ScreenTimeModule) {
            await ScreenTimeModule.clearBlocks();
            result = { success: true };
          } else if (isAndroid && AppBlockerModule) {
            await AppBlockerModule.updateBlockedApps([]);
            result = { success: true };
          } else {
            result = { success: true, mock: true };
          }
          break;
        }

        case 'reapplyBlocks': {
          if (isIOS && ScreenTimeModule) {
            await ScreenTimeModule.reapplyBlocks();
            result = { success: true };
          } else {
            // Android reapplies automatically via the AccessibilityService
            result = { success: true, noop: true };
          }
          break;
        }

        // Signals that the block screen is on screen, so the native cover
        // raised on notification tap can be lowered.
        case 'blockScreenReady': {
          if (isIOS && ScreenTimeModule?.blockScreenReady) {
            await ScreenTimeModule.blockScreenReady();
          }
          result = { success: true };
          break;
        }

        // Lifts the Screen Time shield for `minutes` and then launches
        // `scheme`. Both halves happen natively in one step — splitting them
        // across the JS bridge raced the OS and re-triggered the shield.
        case 'snooze': {
          if (isIOS && ScreenTimeModule) {
            const minutes = data?.minutes || 15;
            const scheme = data?.scheme || '';
            const res = await ScreenTimeModule.snooze(minutes, scheme);
            result = { success: true, ...res };
          } else {
            result = { success: false, error: 'snooze is only available on iOS' };
          }
          break;
        }

        case 'temporaryUnblock': {
          if (isIOS && ScreenTimeModule) {
            const minutes = data?.minutes || 5;
            const res = await ScreenTimeModule.snooze(minutes, '');
            result = { success: true, ...res };
          } else {
            result = { success: false, error: 'temporaryUnblock is only available on iOS' };
          }
          break;
        }

        // --------------------------------------------------------------
        // Android-friendly per-app calls. On iOS these become no-ops
        // because Apple only lets you shield tokens picked in the native
        // picker, not arbitrary bundle IDs.
        // --------------------------------------------------------------
        case 'blockApp': {
          if (isAndroid && AppBlockerModule) {
            await AppBlockerModule.blockApp(data.package);
            result = { success: true };
          } else if (isIOS) {
            result = {
              success: false,
              iosRequiresPicker: true,
              error: 'On iOS use presentPicker() instead of blockApp()',
            };
          } else {
            result = { success: true, mock: true };
          }
          break;
        }

        case 'unblockApp': {
          if (isAndroid && AppBlockerModule) {
            await AppBlockerModule.unblockApp(data.package);
            result = { success: true };
          } else if (isIOS) {
            result = {
              success: false,
              iosRequiresPicker: true,
              error: 'On iOS use presentPicker() to change your block list',
            };
          } else {
            result = { success: true, mock: true };
          }
          break;
        }

        case 'getBlockedApps': {
          if (isAndroid && AppBlockerModule) {
            const apps = await AppBlockerModule.getBlockedApps();
            result = { success: true, apps };
          } else if (isIOS && ScreenTimeModule) {
            // iOS can only report counts, not identifiable app names
            const summary = await ScreenTimeModule.getSelectionSummary();
            result = { success: true, apps: [], ...summary };
          } else {
            result = { success: true, apps: [], mock: true };
          }
          break;
        }

        // Presents the Superwall paywall tied to this placement. The paywall
        // design, products and targeting all come from the Superwall
        // dashboard — nothing here is hardcoded.
        case 'presentPaywall': {
          if (isIOS && placementRegistrar) {
            result = await placementRegistrar(data?.placement || 'campaign_trigger');
          } else {
            result = {
              success: false,
              error: 'paid upgrade is only available in the iOS app',
            };
          }
          break;
        }

        case 'restorePurchases': {
          if (isIOS && purchaseRestorer) {
            const restoration = await purchaseRestorer();
            result = { success: restoration?.result === 'restored', restoration };
          } else {
            result = { success: false, error: 'purchase restoration is only available in the iOS app' };
          }
          break;
        }

        case 'manageSubscription': {
          if (Platform.OS !== 'ios') {
            result = { success: false, error: 'Apple subscriptions are available on iOS.' };
            break;
          }
          try {
            await Linking.openURL('https://apps.apple.com/account/subscriptions');
            result = { success: true };
          } catch {
            result = { success: false, error: 'Could not open Apple subscriptions.' };
          }
          break;
        }

        case 'getSubscriptionStatus': {
          const subscriptionStatus = subscriptionStatusGetter?.() || { status: 'UNKNOWN' };
          result = { success: true, subscriptionStatus };
          break;
        }

        case 'getPlatform': {
          result = { success: true, platform: Platform.OS };
          break;
        }

        // --------------------------------------------------------------
        // Open a third-party app via its URL scheme (e.g. after granting a
        // temporary unblock on iOS, so the user lands back in the app they
        // were trying to open instead of the FocusForge dashboard).
        // --------------------------------------------------------------
        case 'openExternalApp': {
          const scheme = data?.scheme;
          if (!scheme) {
            result = { success: false, error: 'No scheme provided' };
            break;
          }
          try {
            const canOpen = await Linking.canOpenURL(scheme);
            if (canOpen) {
              await Linking.openURL(scheme);
              result = { success: true };
            } else {
              result = { success: false, error: `Cannot open scheme: ${scheme}` };
            }
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;
        }

        default:
          result = { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      result = { success: false, error: error.message };
    }

    return { callbackId, ...result };
  },
};
