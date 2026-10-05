import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import firebaseConfig from '../../firebaseConfig.json';

function createAuth(app: FirebaseApp): Auth {
  try {
    // Persistência em AsyncStorage permite recuperar a sessão ao reabrir o app.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Em hot reload o Auth já foi inicializado.
    return getAuth(app);
  }
}

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = createAuth(app);
export const firestore: Firestore = getFirestore(app);
export const database: Database = getDatabase(app);
export const storage: FirebaseStorage = getStorage(app);
