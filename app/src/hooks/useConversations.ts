import { useEffect, useMemo, useState } from 'react';

import { useMyGroups } from './useGroups';
import { listenMyDirectConversations } from '../services/chatService';
import type { ConversationListItem, DirectConversation } from '../types/chat';
import { friendlyError } from '../utils/errors';

export function useConversations(uid: string) {
  const { groups, loading: loadingGroups, error: groupsError } = useMyGroups(uid);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [loadingDirects, setLoadingDirects] = useState(true);
  const [directError, setDirectError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenMyDirectConversations(
      uid,
      (data) => {
        setDirects(data);
        setDirectError(null);
        setLoadingDirects(false);
      },
      (err) => {
        setDirectError(friendlyError(err, 'Não foi possível carregar as conversas.'));
        setLoadingDirects(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  // Lista derivada e ordenada sem mutar os arrays de origem.
  const items = useMemo<ConversationListItem[]>(() => {
    const directItems: ConversationListItem[] = directs.map((d) => ({
      kind: 'direct',
      id: d.id,
      otherUid: d.participants[0] === uid ? d.participants[1] : d.participants[0],
      createdAt: d.createdAt,
    }));
    const groupItems: ConversationListItem[] = groups.map((g) => ({
      kind: 'group',
      id: g.id,
      name: g.name,
      photoUrl: g.photoUrl,
      memberCount: g.memberIds.length,
      createdAt: g.updatedAt,
    }));
    return [...directItems, ...groupItems].sort((a, b) => b.createdAt - a.createdAt);
  }, [directs, groups, uid]);

  return {
    items,
    loading: loadingGroups || loadingDirects,
    error: groupsError ?? directError,
  };
}
