import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getToken, getServerUrl } from '../auth/authStore';
import { registerDevice } from '../sync/sessionSync';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function setupPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const pushToken = (await Notifications.getExpoPushTokenAsync()).data;

  const [authToken, baseUrl] = await Promise.all([getToken(), getServerUrl()]);
  if (authToken && baseUrl) {
    await registerDevice(authToken, pushToken, baseUrl, Platform.OS);
  }

  return pushToken;
}

export function addNotificationListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
