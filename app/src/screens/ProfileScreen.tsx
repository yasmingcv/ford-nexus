import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { colors } from '../components/theme';
import { useAuth } from '../hooks/useAuth';
import { getSharedProfile } from '../services/userService';
import type { AppStackParamList } from '../types/navigation';
import type { ChatUser } from '../types/user';
import { friendlyError } from '../utils/errors';

type Props = NativeStackScreenProps<AppStackParamList, 'Profile'>;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && styles.unavailable]}>{value || 'Não informado'}</Text>
    </View>
  );
}

export function ProfileScreen({ route }: Props) {
  const { uid } = route.params;
  const { firebaseUser, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (uid === firebaseUser?.uid) {
      setProfile(myProfile);
      setLoading(false);
      return;
    }
    setLoading(true);
    // A API só devolve os dados se houver conversa individual ou grupo em comum.
    getSharedProfile(uid)
      .then((data) => active && setProfile(data))
      .catch((err: unknown) => active && setError(friendlyError(err, 'Perfil indisponível.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [uid, firebaseUser?.uid, myProfile]);

  if (loading) return <Loading label="Carregando perfil..." />;
  if (!profile) return <ErrorMessage message={error ?? 'Perfil indisponível.'} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Avatar uri={profile.photoUrl} name={profile.name} size={120} />
      <Text style={styles.name}>{profile.name || 'Nome não informado'}</Text>
      <Field label="E-mail" value={profile.email} />
      <Field label="Celular" value={profile.phoneNumber} />
      <Field label="Data de nascimento" value={formatDate(profile.birthDate ?? '')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, backgroundColor: colors.background, flexGrow: 1 },
  name: { fontSize: 22, fontWeight: '700', marginVertical: 12, color: colors.text },
  field: { alignSelf: 'stretch', backgroundColor: colors.surface, padding: 14, borderRadius: 10, marginVertical: 5 },
  label: { fontSize: 12, color: colors.muted },
  value: { fontSize: 16, color: colors.text, marginTop: 2 },
  unavailable: { color: colors.muted, fontStyle: 'italic' },
});
