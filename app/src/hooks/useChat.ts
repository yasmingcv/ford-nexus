import { useCallback, useEffect, useMemo, useState } from 'react';

import { listenMessages, requestPush, sendMessage } from '../services/chatService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { friendlyError } from '../utils/errors';

type SendInput = { text: string; target: MessageTarget; mentionedUserIds: string[] };

export function useChat(conversationId: string, conversationType: ConversationType, myUid: string, enabled: boolean) {
  const [messagesById, setMessagesById] = useState<Record<string, ChatMessage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);

  // Listener em tempo real: removido ao desmontar a tela ou trocar de conversa.
  useEffect(() => {
    setMessagesById({});
    setError(null);
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // onChildAdded não sinaliza "fim do carregamento inicial"; liberamos a UI após um curto intervalo.
    const timer = setTimeout(() => setLoading(false), 800);
    const unsubscribe = listenMessages(
      conversationId,
      (message) => {
        setMessagesById((prev) => ({ ...prev, [message.id]: message }));
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err, 'Você não tem acesso a esta conversa.'));
        setLoading(false);
      },
    );
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [conversationId, enabled]);

  const messages = useMemo(
    () => Object.values(messagesById).sort((a, b) => a.createdAt - b.createdAt),
    [messagesById],
  );

  const send = useCallback(
    async ({ text, target, mentionedUserIds }: SendInput): Promise<boolean> => {
      setSending(true);
      setSendError(null);
      setPushWarning(null);
      try {
        const messageId = await sendMessage({
          conversationId,
          conversationType,
          senderId: myUid,
          text,
          target,
          mentionedUserIds,
        });
        // A mensagem já está salva; falha no push não invalida o envio.
        requestPush(conversationId, messageId).catch((err: unknown) =>
          setPushWarning(friendlyError(err, 'Mensagem enviada, mas a notificação falhou.')),
        );
        return true;
      } catch (err) {
        setSendError(friendlyError(err, 'Falha ao enviar a mensagem.'));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, myUid],
  );

  return { messages, loading, error, sending, sendError, pushWarning, send };
}
