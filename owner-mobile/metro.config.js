const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable inline requires for lazy module evaluation and 30-50% faster startup
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Ensure sourceExts includes mjs and cjs without duplicates
config.resolver.sourceExts = Array.from(new Set([...config.resolver.sourceExts, 'mjs', 'cjs']));

module.exports = config;
