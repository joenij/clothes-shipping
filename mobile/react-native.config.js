module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          sourceDir: '../node_modules/react-native-vector-icons/Fonts',
          header: '*.ttf',
        },
      },
    },
  },
  project: {
    ios: {},
    android: {
      sourceDir: '../android',
      appName: 'app',
      packageName: 'com.clothesshippingapp',
    },
  },
  assets: ['./src/assets/fonts/'],
};