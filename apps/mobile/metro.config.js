/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's browser worker imports its SQLite WASM binary directly.
// Metro needs to treat WASM files as assets so the web bundle can resolve it.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
