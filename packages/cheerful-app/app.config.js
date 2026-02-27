export default {
  name: 'Cheerful',
  slug: 'cheerful-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './sources/assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './sources/assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'engineering.cheerful.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './sources/assets/adaptive-icon.png',
      backgroundColor: '#0A0A0A',
    },
    package: 'engineering.cheerful.app',
    permissions: ['INTERNET', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
  },
  web: {
    favicon: './sources/assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    ['expo-router', { root: './sources/app' }],
    'expo-notifications',
    'expo-secure-store',
    'expo-splash-screen',
  ],
  scheme: 'cheerful',
  extra: {
    serverUrl: process.env.CHEERFUL_SERVER_URL || 'http://192.168.31.204:3000',
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '',
    },
  },
};
