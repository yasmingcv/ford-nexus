import { useEffect, useState } from 'react';

import {
  listenNotificationTaps,
  listenTokenRefresh,
  registerDevice,
  type RegistrationResult,
} from '../services/notificationService';
import type { PushPayloadData } from '../types/notification';

export type NotificationStatus = RegistrationResult['status'] | 'pending' | 'error';

const STATUS_MESSAGES: Partial<Record<NotificationStatus, string>> = {
  denied: 'Notificações desativadas. Ative-as nas configurações do aparelho para receber avisos.',
  unsupported: 'Notificações push exigem um dispositivo físico.',
  'no-token': 'Não foi possível obter o token de notificações deste dispositivo.',
  error: 'Falha ao registrar o dispositivo para notificações.',
};

export function useNotifications(uid: string | null, onOpenConversation: (payload: PushPayloadData) => void) {
  const [status, setStatus] = useState<NotificationStatus>('pending');

  useEffect(() => {
    if (!uid) return;
    let active = true;
    registerDevice(uid)
      .then((result) => active && setStatus(result.status))
      .catch(() => active && setStatus('error'));
    const removeRefresh = listenTokenRefresh(uid);
    return () => {
      active = false;
      removeRefresh();
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return listenNotificationTaps(onOpenConversation);
  }, [uid, onOpenConversation]);

  return { status, message: STATUS_MESSAGES[status] ?? null };
}
