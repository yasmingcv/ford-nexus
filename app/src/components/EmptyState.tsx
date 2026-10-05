import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 32, gap: 6 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { color: colors.muted, textAlign: 'center' },
});
