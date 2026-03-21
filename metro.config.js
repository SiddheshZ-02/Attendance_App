const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const baseConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: baseConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...baseConfig.resolver.sourceExts, 'svg'],
  },
};

module.exports = mergeConfig(baseConfig, config);
