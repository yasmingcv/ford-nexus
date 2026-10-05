import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

import { database } from '../services/firebase';

/** Usa o nó especial .info/connected do Realtime Database para detectar falta de conexão. */
export function useConnectivity(): boolean {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let firstEvent = true;
    return onValue(ref(database, '.info/connected'), (snapshot) => {
      // O primeiro evento costuma ser "false" antes de conectar; ignoramos para não piscar o aviso.
      if (firstEvent && snapshot.val() !== true) {
        firstEvent = false;
        return;
      }
      firstEvent = false;
      setConnected(snapshot.val() === true);
    });
  }, []);

  return connected;
}
