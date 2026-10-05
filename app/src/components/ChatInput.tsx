import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from './theme';

type ChatInputProps = {
  sending: boolean;
  disabled?: boolean;
  targetLabel: string | null;
  onClearTarget: () => void;
  onMentionPress?: () => void;
  onSend: (text: string) => Promise<boolean>;
};

export function ChatInput({ sending, disabled = false, targetLabel, onClearTarget, onMentionPress, onSend }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    const ok = await onSend(text);
    if (ok) setText('');
  }, [onSend, text]);

  return (
    <View style={styles.wrapper}>
      {targetLabel ? (
        <View style={styles.targetRow}>
          <Text style={styles.targetText}>Direcionada para @{targetLabel}</Text>
          <Text style={styles.clear} onPress={onClearTarget}>
            remover
          </Text>
        </View>
      ) : null}
      <View style={styles.row}>
        {onMentionPress ? (
          <Pressable onPress={onMentionPress} style={styles.mention} accessibilityLabel="Mencionar integrante">
            <Text style={styles.mentionText}>@</Text>
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Digite uma mensagem"
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          editable={!disabled}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || disabled || !text.trim()}
          style={[styles.send, (sending || disabled || !text.trim()) && styles.sendDisabled]}
          accessibilityLabel="Enviar"
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Enviar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, padding: 8 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 6 },
  targetText: { color: colors.group, fontWeight: '600' },
  clear: { color: colors.danger },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  mention: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.theirs, alignItems: 'center', justifyContent: 'center' },
  mentionText: { fontSize: 18, fontWeight: '700', color: colors.group },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.text,
  },
  send: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600' },
});
