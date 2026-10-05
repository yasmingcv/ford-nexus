import { useEffect, useMemo, useState } from 'react';

import { listenPublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { friendlyError } from '../utils/errors';

export function usePublicProfiles() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenPublicProfiles(
      (data) => {
        setProfiles(data);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err, 'Não foi possível carregar os usuários.'));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const byId = useMemo(() => new Map(profiles.map((p) => [p.uid, p])), [profiles]);

  return { profiles, byId, loading, error };
}
