import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { ErrorMessage } from './ErrorMessage';
import { colors } from './theme';

type PhotoPickerProps = {
  uri: string | null;
  name: string;
  isGroup?: boolean;
  onPick: (uri: string) => void;
};

/** Seleciona uma foto da galeria, solicitando e tratando a permissão. */
export function PhotoPicker({ uri, name, isGroup = false, onPick }: PhotoPickerProps) {
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão da galeria negada. Libere o acesso nas configurações para escolher uma foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) onPick(result.assets[0].uri);
  }, [onPick]);

  return (
    <View style={styles.container}>
      <Pressable onPress={pick} accessibilityLabel="Selecionar foto">
        <Avatar uri={uri} name={name || '?'} size={96} isGroup={isGroup} />
      </Pressable>
      <Text style={styles.link} onPress={pick}>
        {uri ? 'Alterar foto' : 'Selecionar foto'}
      </Text>
      <ErrorMessage message={error} variant="warning" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  link: { color: colors.primary, marginTop: 6, fontWeight: '600' },
});
