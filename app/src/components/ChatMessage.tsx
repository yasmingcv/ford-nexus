import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';
import type { ChatMessage as ChatMessageType } from '../types/chat';

type ChatMessageProps = {
  message: ChatMessageType;
  isMine: boolean;
  authorName: string | null;
  targetName: string | null;
};

function ChatMessageComponent({ message, isMine, authorName, targetName }: ChatMessageProps) {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
      {authorName && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
      {targetName ? <Text style={[styles.target, isMine && styles.mineMeta]}>Para @{targetName}</Text> : null}
      <Text style={[styles.text, isMine && styles.mineText]}>{message.text}</Text>
      <Text style={[styles.time, isMine && styles.mineMeta]}>{time}</Text>
    </View>
  );
}

export const ChatMessage = memo(ChatMessageComponent);

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10, marginVertical: 3, marginHorizontal: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.mine, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.theirs, borderBottomLeftRadius: 4 },
  author: { fontSize: 12, fontWeight: '700', color: colors.group, marginBottom: 2 },
  target: { fontSize: 11, fontStyle: 'italic', color: colors.muted, marginBottom: 2 },
  text: { fontSize: 15, color: colors.text },
  mineText: { color: '#fff' },
  time: { fontSize: 10, color: colors.muted, alignSelf: 'flex-end', marginTop: 4 },
  mineMeta: { color: '#DBEAFE' },
});
