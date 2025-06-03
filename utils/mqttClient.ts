// src/utils/mqttClient.ts

import mqtt from 'mqtt';

const HOST     = process.env.EXPO_PUBLIC_MQTT_SERVER!;    // e.g. "168.235.89.106"
const PORT     = process.env.EXPO_PUBLIC_MQTT_PORT!;      // e.g. "53981"
const USERNAME = process.env.EXPO_PUBLIC_MQTT_USER!;
const PASSWORD = process.env.EXPO_PUBLIC_MQTT_PASSWORD!;

// Log connection details (be careful about logging secrets in production!)
console.log(`[MQTT WS] attempting connection to mqtt://${HOST}:${PORT}`);
console.log(`[MQTT WS] using credentials → user: "${USERNAME}", pass: "${PASSWORD}"`);

export const mqttClient = mqtt.connect(
  `mqtt://${HOST}:${PORT}`,   
  {
    username: USERNAME,
    password: PASSWORD,
    connectTimeout: 10_000,
    keepalive: 30,
  }
);

mqttClient.on('connect', () => {
  console.log(
    `[MQTT WS] connected to mqtt://${HOST}:${PORT} ` +
    `as "${USERNAME}"`
  );
});

mqttClient.on('error', (err) => {
  console.error(
    `[MQTT WS] connection error for ${USERNAME}@mqtt://${HOST}:${PORT}:`,
    err
  );
});




//npx eas build --platform android --profile android-apk
