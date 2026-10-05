import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';

import { auth, firestore } from './firebase';
import { uploadImage } from './storageService';
import type { ChatUser, PublicProfile, RegisterInput } from '../types/user';

export async function register(input: RegisterInput): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = credential.user.uid;

  let photoUrl = '';
  if (input.photoUri) {
    try {
      photoUrl = await uploadImage(input.photoUri, `images/users/${uid}/profile.jpg`);
    } catch {
      // A conta continua válida; o app exibirá a imagem padrão.
      photoUrl = '';
    }
  }

  const profile: ChatUser = {
    uid,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber.trim(),
    birthDate: input.birthDate,
    photoUrl,
    createdAt: Date.now(),
  };
  const publicProfile: PublicProfile = { uid, name: profile.name, photoUrl };

  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'users', uid), profile);
  batch.set(doc(firestore, 'publicProfiles', uid), publicProfile);
  await batch.commit();
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export function observeSession(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
