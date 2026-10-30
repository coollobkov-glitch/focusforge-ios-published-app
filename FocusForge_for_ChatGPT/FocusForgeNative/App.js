import React, { useRef, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform, SafeAreaView, Alert, NativeModules, Linking, Image, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { SuperwallProvider, usePlacement, useSuperwall, useSuperwallEvents } from 'expo-superwall';
import { NativeBridge, setPlacementRegistrar, setPurchaseRestorer, setSubscriptionStatusGetter } from './src/bridge/NativeBridge';
import AppBlocker from './modules/app-blocker/index';
import { createPaywallCoordinator } from './src/purchases/paywallCoordinator';

const ScreenTimeModule = NativeModules.ScreenTimeModule || null;

// Superwall's supported simulated purchases are for the iOS simulator only.
// Physical devices retain the SDK's existing options and real StoreKit flow.
const simulatorPurchaseOptions = (platform, nativeIsSimulator) =>
  platform === 'ios' && nativeIsSimulator === true
    ? { testModeBehavior: 'always' }
    : undefined;
const SUPERWALL_OPTIONS = simulatorPurchaseOptions(Platform.OS, ScreenTimeModule?.isSimulator);


// Superwall dashboard → your app → Settings → Keys → Public API Key.
// This is the PUBLIC key — it's meant to ship inside the app (use the secret
// key only on a server, never here).
const SUPERWALL_IOS_API_KEY = 'pk_ZJsP_fVeG584lSdEM6RV7';

// Set this to true only when actively developing the web app and you want
// live-reload from `npm run dev` (vite). Leave false so the installed app
// works fully offline (no dev server / same-wifi requirement) by loading
// the web app bundled inside the native app via metro's asset pipeline.
const USE_DEV_SERVER = false;
const DEV_URL = 'http://192.168.68.55:3000';

// Bundled single-file build of the web app (see assets/webapp/index.html,
// produced by `npm run build` in the web project + vite-plugin-singlefile).
// Metro (configured via metro.config.js to treat .html as an asset) packages
// this file into both the iOS and Android app bundles automatically.
const LOCAL_WEBAPP_URI = Image.resolveAssetSource(require('./assets/webapp/index.html')).uri;

// Separate, much smaller build containing ONLY the block screen (see
// block.html / src/block-main.jsx in the web project). The full bundle has to
// parse every screen — including the Dashboard's charting library — before it
// can render anything, which is dead time on the shield path where the block
// screen is all the user will see. Loading this instead cuts the JS parsed on
// that path by more than half.
const LOCAL_BLOCK_URI = Image.resolveAssetSource(require('./assets/webapp/block.html')).uri;

// Builds the WebView source. When `blocked` is true, `?blocked=1` is baked
// into the URL BEFORE the page ever loads, so the web app's very first React
// render already shows the block screen (see getInitialBlockedApp in
// useStore.js) — instead of loading the dashboard and redirecting into the
// block screen afterwards, which is what caused the visible flash/pause.
const buildSource = (blocked) => {
  if (USE_DEV_SERVER) {
    return {
      uri: blocked
        ? `${DEV_URL}/block.html?blocked=1&home=${encodeURIComponent(DEV_URL)}`
        : DEV_URL,
    };
  }
  // `home` tells the block screen where the full app lives, so it can hand off
  // when dismissed. Asset URIs are resolved at runtime and can't be hardcoded
  // on the web side, so they're passed in.
  return {
    uri: blocked
      ? `${LOCAL_BLOCK_URI}?blocked=1&home=${encodeURIComponent(LOCAL_WEBAPP_URI)}`
      : LOCAL_WEBAPP_URI,
  };
};

// Check if URL is internal (for navigation filtering)
const isInternalUrl = (url) => {
  if (USE_DEV_SERVER) {
    return url.startsWith(DEV_URL) || url.startsWith('about:');
  }
  // Must cover both bundles — dismissing the block screen navigates from
  // block.html to index.html.
  return (
    url.startsWith('file://') ||
    url.startsWith('about:') ||
    url.startsWith(LOCAL_WEBAPP_URI) ||
    url.startsWith(LOCAL_BLOCK_URI)
  );
};

const isBlockDeepLink = (url) => !!url && url.startsWith('focusforge://') && url.includes('block');
const isAuthDeepLink = (url) => !!url && url.startsWith('focusforge://auth/');

// Connects the Superwall placement API to the WebView bridge. Placements must
// be registered from inside a component under SuperwallProvider, but bridge
// messages arrive in the FlatList-less NativeBridge object — this component is
// the adapter between the two.
function SuperwallBridge() {
  const coordinatorRef = useRef(null);
  if (!coordinatorRef.current) coordinatorRef.current = createPaywallCoordinator();
  const coordinator = coordinatorRef.current;
  const { registerPlacement } = usePlacement({
    onError: (error) => {
      console.warn('[Superwall] paywall error:', error);
      coordinator.failed();
    },
    onDismiss: () => coordinator.dismissed(),
    onSkip: () => coordinator.skipped(),
  });
  const restorePurchases = useSuperwall((state) => state.restorePurchases);
  const subscriptionStatus = useSuperwall((state) => state.subscriptionStatus);
  const productErrorShown = useRef(false);

  useSuperwallEvents({
    onSuperwallEvent: ({ event }) => {
      if (event?.event === 'transactionStart') productErrorShown.current = false;
      if (event?.event === 'transactionFail') {
        Alert.alert('Purchase Could Not Start', event.error || 'Please try again.');
      }
      if (event?.event === 'paywallProductsLoadMissingProducts' && !productErrorShown.current) {
        productErrorShown.current = true;
        Alert.alert(
          'Plans Are Not Available Yet',
          `The App Store could not find: ${(event.identifiers || []).join(', ')}. Check the subscription setup in App Store Connect.`
        );
      }
      if (event?.event === 'paywallProductsLoadFail' && !productErrorShown.current) {
        productErrorShown.current = true;
        Alert.alert('Plans Could Not Load', 'Check your internet connection and try again.');
      }
    },
  });

  useEffect(() => {
    setPlacementRegistrar((placement) =>
      coordinator.open(
        (name) => registerPlacement({ placement: name, feature: () => {} }),
        placement
      )
    );
    setPurchaseRestorer(restorePurchases);
    setSubscriptionStatusGetter(() => subscriptionStatus);
    return () => {
      setPlacementRegistrar(null);
      setPurchaseRestorer(null);
      setSubscriptionStatusGetter(null);
    };
  }, [registerPlacement, restorePurchases, subscriptionStatus, coordinator]);

  useEffect(() => () => coordinator.dispose(), [coordinator]);

  return null;
}

export default function App() {
  const webViewRef = useRef(null);
  // Null until we've checked whether this is a cold start via the shield's
  // "Open FocusForge" notification. Keeping the WebView unmounted until then
  // lets us bake `?blocked=1` into its initial source, instead of loading the
  // dashboard first and injecting a redirect after the fact.
  const [webviewSource, setWebviewSource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthUrl, setInitialAuthUrl] = useState('');

  // A single notification tap reaches us twice: once via the deep link and
  // once via the foreground pending-check. Both used to drive the block
  // navigation, so one distraction attempt got counted twice. Only the first
  // per foreground does the work; reaching a blocked app again requires
  // leaving the app, which resets this on backgrounding below.
  const blockNavHandledRef = useRef(false);

  // Guarded entry point — use this instead of navigateToBlockScreen for
  // anything reacting to a notification tap, so duplicate triggers collapse
  // into one.
  const handleBlockNavigation = () => {
    if (blockNavHandledRef.current) return;
    blockNavHandledRef.current = true;
    navigateToBlockScreen();
  };

  // Inject JS to navigate the WebView to the block screen. Used for warm
  // starts only — cold starts are handled by baking the query param into the
  // initial source below, which is instant with no injection round-trip.
  const navigateToBlockScreen = () => {
    if (webViewRef.current) {
      // The readiness signal is sent from here rather than relying solely on
      // the block screen's mount effect. If the app was left ON the block
      // screen, arriving there again is a no-op state change — the component
      // never re-mounts, so its effect never re-runs, and the native cover
      // would stay up until its safety timeout. Reporting after the next paint
      // covers both cases: freshly mounted and already showing.
      webViewRef.current.injectJavaScript(`
        window.location.hash = '/block';
        window.dispatchEvent(new CustomEvent('focusforge-shield-unlock'));
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            if (window.FocusForgeNative && window.FocusForgeNative.blockScreenReady) {
              window.FocusForgeNative.blockScreenReady();
            }
          });
        });
        true;
      `);
    }
  };

  const deliverAuthCallback = (url) => {
    if (!url || !webViewRef.current) return;
    const serializedUrl = JSON.stringify(url);
    webViewRef.current.injectJavaScript(`
      window.FocusForgeNative = window.FocusForgeNative || {};
      window.FocusForgeNative.pendingAuthUrl = ${serializedUrl};
      window.dispatchEvent(new CustomEvent('focusforge-auth-callback', { detail: { url: ${serializedUrl} } }));
      true;
    `);
  };

  // Decide the initial source once, then mount the WebView with the block
  // state already baked in. The native pending flag (set the instant the
  // notification is tapped, before the app is even active) is authoritative —
  // Linking.getInitialURL() misses the notification-launch case, since the app
  // is launched by the notification and only *then* sent the URL.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let blocked = false;
      if (Platform.OS === 'ios') {
        try {
          if (ScreenTimeModule?.isBlockNavigationPending) {
            const res = await ScreenTimeModule.isBlockNavigationPending();
            blocked = !!res?.pending;
          }
          const initialUrl = await Linking.getInitialURL();
          if (!blocked) {
            blocked = isBlockDeepLink(initialUrl);
          }
          if (isAuthDeepLink(initialUrl)) {
            setInitialAuthUrl(initialUrl);
          }
        } catch (e) {
          console.log('[FocusForge] initial block check failed:', e?.message || e);
        }
      }
      if (!cancelled) setWebviewSource(buildSource(blocked));
    })();
    return () => { cancelled = true; };
  }, []);

  // Check and request accessibility permission on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        const hasPermission = await AppBlocker.checkPermission();
        if (!hasPermission) {
          Alert.alert(
            'Enable App Blocking',
            'FocusForge needs Accessibility permission to block distracting apps. Tap OK to open settings, then find "FocusForge App Blocker" and enable it.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'OK', onPress: () => AppBlocker.requestPermission() },
            ]
          );
        }
      })();
    }
  }, []);

  // On iOS, reapply the previously-selected shield so blocks survive between
  // app launches / reboots. This also runs on every foreground so an expired
  // snooze gets enforced promptly. The native module checks the authoritative
  // snoozeUntil timestamp and no-ops while a snooze is still active, so this
  // can never cut a snooze short. Silently no-ops if not yet authorized.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !ScreenTimeModule) return;

    const reapply = () => {
      ScreenTimeModule.reapplyBlocks().catch((e) => {
        console.log('[FocusForge] reapplyBlocks skipped:', e?.message || e);
      });
    };

    reapply();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reapply();
    });
    return () => subscription?.remove();
  }, []);

  // WKWebView does not reliably emit browser focus/visibility events when iOS
  // resumes it. Forward app state so pending email confirmation checks resume
  // even when its link was opened in a different browser or on another device.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      webViewRef.current?.injectJavaScript(`
        window.dispatchEvent(new CustomEvent('focusforge-app-state-change', {
          detail: { state: ${JSON.stringify(state)} }
        })); true;
      `);
    });
    return () => subscription?.remove();
  }, []);

  // On every foreground, ask native whether a block navigation is pending.
  // This covers the warm-start case where the notification tap resumes an
  // already-running app: the WebView is still on the old tab (hidden behind
  // the native cover), so we route it before the cover comes down.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !ScreenTimeModule?.isBlockNavigationPending) return;

    const checkPending = async () => {
      try {
        const res = await ScreenTimeModule.isBlockNavigationPending();
        if (res?.pending) handleBlockNavigation();
      } catch (e) {
        console.log('[FocusForge] pending block check failed:', e?.message || e);
      }
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPending();
      } else if (state === 'background') {
        // Leaving the app means the next shield hit is a genuinely new
        // attempt, so allow it to be handled (and counted) again.
        blockNavHandledRef.current = false;
      }
    });
    return () => subscription?.remove();
  }, []);

  // Handle deep link from Shield Action Extension (focusforge://block) while
  // the app is already running (warm start). Cold start is handled above by
  // baking the block state directly into the WebView's initial source.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const handleDeepLink = (event) => {
      const url = event?.url || '';
      console.log('[FocusForge] Deep link received:', url);
      if (isBlockDeepLink(url)) {
        // The native cover is already up (raised on notification tap), and
        // stays up until the web app reports the block screen is rendered.
        handleBlockNavigation();
      } else if (isAuthDeepLink(url)) {
        deliverAuthCallback(url);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription?.remove();
  }, []);

  // Handle messages from the web app
  const handleMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      // Handle blocked apps sync from web app
      if (message.action === 'syncBlockedApps' && Platform.OS === 'android') {
        const packages = (message.data?.apps || []).map(app => app.package);
        await AppBlocker.updateBlockedApps(packages);
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            callbackId: message.callbackId,
            success: true,
          }));
        }
        return;
      }

      if (message.action === 'checkBlockerPermission' && Platform.OS === 'android') {
        const hasPermission = await AppBlocker.checkPermission();
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            callbackId: message.callbackId,
            hasPermission,
          }));
        }
        return;
      }

      if (message.action === 'requestBlockerPermission' && Platform.OS === 'android') {
        await AppBlocker.requestPermission();
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            callbackId: message.callbackId,
            success: true,
          }));
        }
        return;
      }

      if (message.action === 'getInstalledApps' && Platform.OS === 'android') {
        const apps = await AppBlocker.getInstalledApps();
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            callbackId: message.callbackId,
            apps,
          }));
        }
        return;
      }

      const response = await NativeBridge.handleMessage(message);
      
      // Send response back to web app
      if (webViewRef.current && response) {
        webViewRef.current.postMessage(JSON.stringify(response));
      }
    } catch (error) {
      console.error('Bridge message error:', error);
    }
  };

  // JavaScript to inject into the WebView to set up the bridge
  const injectedJS = `
    (function() {
      // Create bridge for web app to communicate with native
      window.FocusForgeNative = {
        isNative: true,
        platform: '${Platform.OS}',
        pendingAuthUrl: ${JSON.stringify(initialAuthUrl)},
        
        // Send a message to native and get a response
        postMessage: function(action, data) {
          return new Promise(function(resolve) {
            var callbackId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Store the callback
            window.FocusForgeNative._callbacks = window.FocusForgeNative._callbacks || {};
            window.FocusForgeNative._callbacks[callbackId] = resolve;
            
            // Send to native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              action: action,
              data: data,
              callbackId: callbackId
            }));
          });
        },
        
        // Called by native to deliver responses
        _onResponse: function(callbackId, response) {
          if (window.FocusForgeNative._callbacks && window.FocusForgeNative._callbacks[callbackId]) {
            window.FocusForgeNative._callbacks[callbackId](response);
            delete window.FocusForgeNative._callbacks[callbackId];
          }
        },

        // Convenience methods
        blockApp: function(packageName) {
          return this.postMessage('blockApp', { package: packageName });
        },
        unblockApp: function(packageName) {
          return this.postMessage('unblockApp', { package: packageName });
        },
        getBlockedApps: function() {
          return this.postMessage('getBlockedApps', {});
        },
        requestPermissions: function() {
          return this.postMessage('requestPermissions', {});
        },
        checkPermissions: function() {
          return this.postMessage('checkPermissions', {});
        },

        // iOS Screen Time (Family Controls). No-ops on Android — the web
        // app should only call these when platform === 'ios'.
        presentPicker: function() {
          return this.postMessage('presentPicker', {});
        },
        getSelectionSummary: function() {
          return this.postMessage('getSelectionSummary', {});
        },
        setActiveAccount: function(accountId) {
          return this.postMessage('setActiveAccount', { accountId: accountId || null });
        },
        clearBlocks: function() {
          return this.postMessage('clearBlocks', {});
        },
        reapplyBlocks: function() {
          return this.postMessage('reapplyBlocks', {});
        },
        temporaryUnblock: function(minutes) {
          return this.postMessage('temporaryUnblock', { minutes: minutes || 5 });
        },
        // Lift the shield for N minutes and open the target app, all natively.
        snooze: function(minutes, scheme) {
          return this.postMessage('snooze', {
            minutes: minutes || 15,
            scheme: scheme || ''
          });
        },
        openExternalApp: function(scheme) {
          return this.postMessage('openExternalApp', { scheme: scheme });
        },
        // Called by the block screen once it has rendered, which lowers the
        // native cover hiding the previous tab.
        blockScreenReady: function() {
          return this.postMessage('blockScreenReady', {});
        },
        // Presents the Superwall paywall for a dashboard placement.
        presentPaywall: function(placement) {
          return this.postMessage('presentPaywall', { placement: placement || '' });
        },
        manageSubscription: function() {
          return this.postMessage('manageSubscription', {});
        },
        restorePurchases: function() {
          return this.postMessage('restorePurchases', {});
        },
        getSubscriptionStatus: function() {
          return this.postMessage('getSubscriptionStatus', {});
        }
      };

      // Route responses posted back from native (via webViewRef.postMessage)
      // to the matching pending callback. Without this, every native bridge
      // call (temporaryUnblock, presentPicker, etc.) hangs forever because
      // its promise is never resolved. iOS delivers these on 'window',
      // Android on 'document' — listen on both for safety.
      function handleNativeResponse(event) {
        try {
          var response = JSON.parse(event.data);
          if (response && response.callbackId) {
            window.FocusForgeNative._onResponse(response.callbackId, response);
          }
        } catch (e) {}
      }
      window.addEventListener('message', handleNativeResponse);
      document.addEventListener('message', handleNativeResponse);

      // Notify the web app that native bridge is ready
      window.dispatchEvent(new Event('focusforge-native-ready'));
      
      true;
    })();
  `;

  return (
    // SuperwallProvider initialises the SDK once at startup so paywall
    // placements can render on top of the WebView later. The key comes from
    // Superwall dashboard → Settings → Keys → Public API Key.
    <SuperwallProvider apiKeys={{ ios: SUPERWALL_IOS_API_KEY }} options={SUPERWALL_OPTIONS}>
      <SuperwallBridge />
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor="#030712" />

      {webviewSource && (
        <WebView
          ref={webViewRef}
          source={webviewSource}
          style={styles.webview}
          injectedJavaScript={injectedJS}
          onMessage={handleMessage}
          onLoadEnd={() => {
            setIsLoading(false)
            if (initialAuthUrl) {
              deliverAuthCallback(initialAuthUrl)
              // Clear after first delivery — otherwise the value baked into
              // injectedJS re-injects on every later page navigation (e.g.
              // block screen → main app) and replays an already-consumed code.
              setInitialAuthUrl('')
            }
          }}

          // Allow the web app to work properly
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          allowsBackForwardNavigationGestures={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}

          // Dark background to match the app
          backgroundColor="#030712"

          // Allow mixed content for development
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}

          // Handle navigation within the app
          onShouldStartLoadWithRequest={(request) => {
            // Allow internal navigation
            if (isInternalUrl(request.url)) {
              return true;
            }
            // Open external links in system browser
            return false;
          }}
        />
      )}

      {/* Plain matching-color cover instead of a spinner — any brief pause
          should look like nothing is happening yet, not like it's buffering. */}
      {(!webviewSource || isLoading) && (
        <View style={styles.loader} pointerEvents="none" />
      )}
      </SafeAreaView>
    </SuperwallProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  webview: {
    flex: 1,
    backgroundColor: '#030712',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: '#030712',
  },
});
