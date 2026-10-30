// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Treat .html as a bundleable asset so the built web app (a single self
// contained index.html produced by `vite build` + vite-plugin-singlefile)
// can be `require()`d and shipped inside the native app bundle. This lets
// the WebView load the app fully offline, without needing the Vite dev
// server running on the same network.
config.resolver.assetExts.push('html');

module.exports = config;
