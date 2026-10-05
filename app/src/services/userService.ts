import { collection, doc, getDoc, onSnapshot, orderBy, query, type DocumentData } from 'firebase/firestore';

import { apiRequest } from './apiService';
import { firestore } from './firebase';
import type { ChatUser, PublicProfile } from '../types/user';

function toPublicProfile(uid: string, data: DocumentData): PublicProfile {
  return {
    uid,
    name: typeof data.name === 'string' ? data.name : 'Usuário',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
  };
}

/** Escuta a lista pública de usuários (apenas nome e foto). */
export function listenPublicProfiles(
  onData: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(collection(firestore, 'publicProfiles'), orderBy('name'));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map((d) => toPublicProfile(d.id, d.data()))),
    onError,
  );
}

export async function getMyProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? (snapshot.data() as ChatUser) : null;
}

/**
 * Perfil completo de outro usuário. A API verifica se existe conversa individual
 * ou grupo em comum antes de devolver os dados cadastrais.
 */
export async function getSharedProfile(uid: string): Promise<ChatUser> {
  const result = await apiRequest<{ profile: ChatUser }>(`/profiles/${encodeURIComponent(uid)}`, {
    method: 'GET',
  });
  return result.profile;
}
