

// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');      // ← change here
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// (1) Point Metro at the real AssetRegistry so PNGs in node_modules work again
config.resolver.assetRegistryPath = require.resolve(
  'react-native/Libraries/Image/AssetRegistry'
);

// (2) Re-enable Expo’s asset-hash plugin so images/fonts get registered
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],

  // (3) allow require.context() for Expo Router’s file-based routing
  unstable_allowRequireContext: true,
};

// (4) Finally wrap with NativeWind, pointing at your global.css
module.exports = withNativeWind(config, {
  input: './global.css',
});
