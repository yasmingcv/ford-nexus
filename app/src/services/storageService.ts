import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from './firebase';

/**
 * Envia a imagem local ao Firebase Storage e devolve apenas a URL pública final.
 * Nenhuma imagem é gravada em Base64 nos bancos.
 */
export async function uploadImage(localUri: string, path: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}
