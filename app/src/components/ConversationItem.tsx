import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors } from './theme';

type ConversationItemProps = {
  title: string;
  subtitle: string;
  photoUrl: string;
  isGroup: boolean;
  onPress: () => void;
};

function ConversationItemComponent({ title, subtitle, photoUrl, isGroup, onPress }: ConversationItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar uri={photoUrl} name={title} isGroup={isGroup} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: isGroup ? colors.group : colors.primary }]}>
        <Text style={styles.badgeText}>{isGroup ? 'Grupo' : 'Individual'}</Text>
      </View>
    </Pressable>
  );
}

export const ConversationItem = memo(ConversationItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { color: colors.muted, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
