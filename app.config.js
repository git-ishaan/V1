// app.config.js
import 'dotenv/config';
export default ({ config }) => ({
  ...config,
  android: {
    ...(config.android || {}),
    usesCleartextTraffic: true,
    networkSecurityConfig: './network-security-config.xml',
  },
  plugins: [
    ...(config.plugins || []),
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: true,
        },
      },
    ],
    [
      'expo-network-security-config',
      {
        networkSecurityConfig: './network-security-config.xml',
        enable: true,
      },
    ],
  ],
  extra: {
    ...(config.extra || {}),
     EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_API_KEY:      process.env.EXPO_PUBLIC_API_KEY,
  },
});