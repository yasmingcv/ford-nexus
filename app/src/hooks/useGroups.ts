import { useEffect, useState } from 'react';

import { listenGroup, listenMyGroups } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { friendlyError } from '../utils/errors';

export function useMyGroups(uid: string) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenMyGroups(
      uid,
      (data) => {
        setGroups(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err, 'Não foi possível carregar os grupos.'));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  return { groups, loading, error };
}

export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = listenGroup(
      groupId,
      (data) => {
        setGroup(data);
        setError(data ? null : 'Grupo não encontrado ou você não faz mais parte dele.');
        setLoading(false);
      },
      (err) => {
        setGroup(null);
        setError(friendlyError(err, 'Você não tem acesso a este grupo.'));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [groupId]);

  return { group, loading, error };
}
