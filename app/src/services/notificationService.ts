import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firestore } from './firebase';
import type { PushPayloadData } from '../types/notification';
import type { DeviceRegistration } from '../types/user';

export type RegistrationResult =
  | { status: 'registered'; deviceId: string }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'no-token' };

let currentDeviceId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Android: token nativo do FCM (enviado pela API via Firebase Admin Messaging).
 * iOS: Expo Push Token (a API envia pelo Expo Push Service, que entrega via APNs).
 */
async function obtainToken(): Promise<Pick<DeviceRegistration, 'token' | 'tokenType'> | null> {
  if (Platform.OS === 'android') {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    return typeof deviceToken.data === 'string' ? { token: deviceToken.data, tokenType: 'fcm' } : null;
  }
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  const expoToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return expoToken.data ? { token: expoToken.data, tokenType: 'expo' } : null;
}

function deviceIdFor(token: string): string {
  // Id estável derivado do token, sem caracteres inválidos para o Firestore.
  return token.replace(/[^a-zA-Z0-9]/g, '').slice(-60);
}

export async function registerDevice(uid: string): Promise<RegistrationResult> {
  if (!Device.isDevice) return { status: 'unsupported' };
  const granted = await requestPermission();
  if (!granted) return { status: 'denied' };

  const token = await obtainToken();
  if (!token) return { status: 'no-token' };

  const deviceId = deviceIdFor(token.token);
  const registration: DeviceRegistration = {
    ...token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    enabled: true,
    updatedAt: Date.now(),
  };
  // users/{uid}/devices é privado: somente o dono (e a API via Admin SDK) acessa.
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), registration);
  currentDeviceId = deviceId;
  return { status: 'registered', deviceId };
}

/** No logout, remove o token para que o usuário anterior não receba mais push neste aparelho. */
export async function unregisterCurrentDevice(uid: string): Promise<void> {
  if (!currentDeviceId) return;
  const deviceId = currentDeviceId;
  currentDeviceId = null;
  await deleteDoc(doc(firestore, 'users', uid, 'devices', deviceId));
}

/** Atualiza o token quando o sistema o renovar. */
export function listenTokenRefresh(uid: string): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void registerDevice(uid);
  });
  return () => subscription.remove();
}

function parsePayload(data: Record<string, unknown> | undefined): PushPayloadData | null {
  if (!data) return null;
  const { conversationId, conversationType } = data;
  if (typeof conversationId !== 'string') return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return { conversationId, conversationType };
}

/** Trata o toque na notificação (app aberto, em segundo plano ou fechado). */
export function listenNotificationTaps(onOpen: (payload: PushPayloadData) => void): () => void {
  const lastResponse = Notifications.getLastNotificationResponse();
  const initial = parsePayload(lastResponse?.notification.request.content.data);
  if (initial) onOpen(initial);

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = parsePayload(response.notification.request.content.data);
    if (payload) onOpen(payload);
  });
  return () => subscription.remove();
}
