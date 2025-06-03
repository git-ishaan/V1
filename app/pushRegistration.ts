// app/pushRegistration.ts
//------------------------------------------------------------------
// Registers the device with Expo notifications **and**
// POSTs { device_id_str, expo_token } to /devices/register.
// The device‐id is guaranteed to be:
//   • Stable across launches
//   • Unique per physical handset
//------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';          // ← NEW
import { apiFetch } from './api';

export function useRegisterForPushNotificationsAsync() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!Device.isDevice) {
      console.warn('[PushRegistration] Must run on a physical device.');
      return;
    }

    (async () => {
      try {
        // 1️⃣ Permission flow
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          ({ status } = await Notifications.requestPermissionsAsync());
        }
        if (status !== 'granted') {
          Alert.alert(
            'Push Notifications',
            'Permission denied. Enable notifications in system settings.'
          );
          return;
        }

        // 2️⃣ Android channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // 3️⃣ Expo token
        const { data: token } = await Notifications.getExpoPushTokenAsync();
        console.log('[PushRegistration] Expo push token:', token);
        setExpoPushToken(token);

        // 4️⃣ Register with backend
        await registerDevice(token);
      } catch (err) {
        console.error('[PushRegistration] Error:', err);
      }
    })();
  }, []);

  return expoPushToken;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Returns a deterministic, stable string for this handset.
 * Priority:
 *   • Android: androidId
 *   • iOS:     IDFV
 *   • Else:    SHA-1 hash of model/os/build info, persisted to storage
 */
async function getStableDeviceId(): Promise<string> {
  // Native IDs if available
  try {
    if (Platform.OS === 'android' && Application.androidId) {
      return Application.androidId;
    }
    if (Platform.OS === 'ios') {
      const idfv = await Application.getIosIdForVendorAsync();
      if (idfv) return idfv;
    }
  } catch (e) {
    console.warn('[PushRegistration] Unable to read native id:', e);
  }

  // Already generated?
  const saved = await AsyncStorage.getItem('uniqueDeviceId');
  if (saved) return saved;

  // Derive from hardware + build info, then hash.
  const raw =
    [
      Device.modelId,
      Device.modelName,
      Device.osName,
      Device.osVersion,
      Device.osBuildId,
      Device.deviceName,
    ]
      .filter(Boolean)
      .join('|') || `${Platform.OS}-unknown`;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    raw
  );

  const fallback = `${Platform.OS}-${hash.slice(0, 20)}`;
  await AsyncStorage.setItem('uniqueDeviceId', fallback);
  return fallback;
}

async function registerDevice(expoToken: string) {
  const deviceId = await getStableDeviceId();
  const payload  = { device_id_str: deviceId, expo_token: expoToken };

  console.log('[PushRegistration] ── Network Request ─────────────────');
  console.log('POST /devices/register');
  console.log('Payload:', payload);

  await apiFetch('/devices/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
