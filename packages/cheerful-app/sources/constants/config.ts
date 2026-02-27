import Constants from 'expo-constants';

export const config = {
  serverUrl: Constants.expoConfig?.extra?.serverUrl || 'https://api.cheerful.engineering',
  appName: 'Cheerful',
  version: Constants.expoConfig?.version || '0.1.0',
};
