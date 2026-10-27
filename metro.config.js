const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// extraNodeModules is only a fallback after node_modules lookup. Intercept ws
// before that lookup so Supabase's Node fallback cannot enter native bundles.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws' && (platform === 'android' || platform === 'ios')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve('./src/services/ws-shim.js'),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
