import { firestore, messaging } from './firebaseAdmin';
import type { ConversationType, DeviceDoc, DeviceRef } from '../types';

type PushContent = {
  title: string;
  body: string;
  data: { conversationId: string; conversationType: ConversationType };
};

type ExpoTicket = { status: 'ok' | 'error'; details?: { error?: string } };

const INVALID_FCM_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export async function loadDevices(uids: string[]): Promise<DeviceRef[]> {
  const results = await Promise.all(
    uids.map(async (uid) => {
      const snap = await firestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get();
      return snap.docs.map((d) => ({ ...(d.data() as DeviceDoc), uid, path: d.ref.path }));
    }),
  );
  return results.flat();
}

/** Tokens inválidos são removidos para não receberem novos envios. */
async function removeDevices(paths: string[]): Promise<void> {
  await Promise.all(paths.map((path) => firestore.doc(path).delete()));
}

async function sendFcm(devices: DeviceRef[], content: PushContent): Promise<{ sent: number; invalid: string[] }> {
  if (!devices.length) return { sent: 0, invalid: [] };
  const response = await messaging.sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    notification: { title: content.title, body: content.body },
    data: content.data,
    android: { priority: 'high', notification: { channelId: 'messages' } },
  });
  const invalid = response.responses.flatMap((r, i) =>
    !r.success && r.error && INVALID_FCM_CODES.has(r.error.code) ? [devices[i].path] : [],
  );
  return { sent: response.successCount, invalid };
}

async function sendExpo(devices: DeviceRef[], content: PushContent): Promise<{ sent: number; invalid: string[] }> {
  if (!devices.length) return { sent: 0, invalid: [] };
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(
      devices.map((d) => ({ to: d.token, title: content.title, body: content.body, data: content.data, sound: 'default' })),
    ),
  });
  if (!response.ok) throw new Error(`Expo push falhou: ${response.status}`);
  const json = (await response.json()) as { data: ExpoTicket[] };
  const invalid = json.data.flatMap((ticket, i) =>
    ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? [devices[i].path] : [],
  );
  return { sent: json.data.filter((t) => t.status === 'ok').length, invalid };
}

export async function sendPush(devices: DeviceRef[], content: PushContent): Promise<number> {
  const [fcm, expo] = await Promise.all([
    sendFcm(devices.filter((d) => d.tokenType === 'fcm'), content),
    sendExpo(devices.filter((d) => d.tokenType === 'expo'), content),
  ]);
  await removeDevices([...fcm.invalid, ...expo.invalid]);
  return fcm.sent + expo.sent;
}
