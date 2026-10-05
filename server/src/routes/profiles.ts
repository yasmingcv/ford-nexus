import { Router } from 'express';

import { directConversationId } from '../services/conversationService';
import { firestore } from '../services/firebaseAdmin';

export const profilesRouter = Router();

async function sharesConversation(requester: string, target: string): Promise<boolean> {
  const direct = await firestore.collection('directConversations').doc(directConversationId(requester, target)).get();
  if (direct.exists) return true;
  const groups = await firestore.collection('groups').where('memberIds', 'array-contains', requester).get();
  return groups.docs.some((g) => ((g.get('memberIds') as string[] | undefined) ?? []).includes(target));
}

/** Dados cadastrais apenas para quem compartilha conversa individual ou grupo com o perfil. */
profilesRouter.get('/profiles/:uid', async (req, res) => {
  const requester = res.locals.uid;
  const { uid } = req.params;
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) {
    res.status(400).json({ error: 'Usuário inválido.' });
    return;
  }
  if (uid !== requester && !(await sharesConversation(requester, uid))) {
    res.status(403).json({ error: 'Você só pode ver perfis de pessoas com quem conversa.' });
    return;
  }
  const snap = await firestore.collection('users').doc(uid).get();
  if (!snap.exists) {
    res.status(404).json({ error: 'Perfil não encontrado.' });
    return;
  }
  const data = snap.data() ?? {};
  res.json({
    profile: {
      uid,
      name: data.name ?? '',
      email: data.email ?? '',
      phoneNumber: data.phoneNumber ?? '',
      birthDate: data.birthDate ?? '',
      photoUrl: data.photoUrl ?? '',
      createdAt: data.createdAt ?? 0,
    },
  });
});
