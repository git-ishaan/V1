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

    // // InfluxDB
    // EXPO_PUBLIC_INFLUX_URL:             process.env.EXPO_PUBLIC_INFLUX_URL,
    // EXPO_PUBLIC_INFLUXDB_ORG:           process.env.EXPO_PUBLIC_INFLUXDB_ORG,
    // EXPO_PUBLIC_INFLUXDB_BUCKET:        process.env.EXPO_PUBLIC_INFLUXDB_BUCKET,
    // EXPO_PUBLIC_INFLUXDB_POSTBUCKET:    process.env.EXPO_PUBLIC_INFLUXDB_POSTBUCKET,
    // EXPO_PUBLIC_INFLUXDB_THRESHOLDS_BUCKET: process.env.EXPO_PUBLIC_INFLUXDB_THRESHOLDS_BUCKET,
    // EXPO_PUBLIC_INFLUXDB_USER:          process.env.EXPO_PUBLIC_INFLUXDB_USER,
    // EXPO_PUBLIC_INFLUXDB_PASSWORD:      process.env.EXPO_PUBLIC_INFLUXDB_PASSWORD,
    // EXPO_PUBLIC_INFLUXDB_TOKEN:         process.env.EXPO_PUBLIC_INFLUXDB_TOKEN,

    // // MQTT
    // EXPO_PUBLIC_MQTT_SERVER:            process.env.EXPO_PUBLIC_MQTT_SERVER,
    // EXPO_PUBLIC_MQTT_PORT:              process.env.EXPO_PUBLIC_MQTT_PORT,
    // EXPO_PUBLIC_MQTT_USER:              process.env.EXPO_PUBLIC_MQTT_USER,
    // EXPO_PUBLIC_MQTT_PASSWORD:          process.env.EXPO_PUBLIC_MQTT_PASSWORD,
  },
});
