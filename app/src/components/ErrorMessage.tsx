import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

type ErrorMessageProps = {
  message: string | null | undefined;
  variant?: 'error' | 'warning';
};

export function ErrorMessage({ message, variant = 'error' }: ErrorMessageProps) {
  if (!message) return null;
  const isWarning = variant === 'warning';
  return (
    <View style={[styles.box, { backgroundColor: isWarning ? colors.warningBg : colors.dangerBg }]}>
      <Text style={{ color: isWarning ? colors.warning : colors.danger }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 8, padding: 10, marginVertical: 6 },
});
