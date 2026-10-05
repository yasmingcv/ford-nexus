import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

type AvatarProps = {
  uri: string | null | undefined;
  name: string;
  size?: number;
  isGroup?: boolean;
};

/** Mostra a foto ou uma imagem padrão (iniciais) quando ela não existe ou falha ao carregar. */
export function Avatar({ uri, name, size = 44, isGroup = false }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [uri]);

  const initials = useMemo(
    () =>
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?',
    [name],
  );

  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, dimension, { backgroundColor: isGroup ? colors.group : colors.primary }]}>
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={[dimension, styles.image]} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
  image: { backgroundColor: colors.border },
});
