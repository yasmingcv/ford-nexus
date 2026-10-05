import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors } from './theme';

type GroupMemberItemProps = {
  name: string;
  photoUrl: string;
  isOwner?: boolean;
  isMe?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export function GroupMemberItem({
  name,
  photoUrl,
  isOwner = false,
  isMe = false,
  selected,
  disabled = false,
  onPress,
  actionLabel,
  onAction,
}: GroupMemberItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Avatar uri={photoUrl} name={name} size={40} />
      <View style={styles.info}>
        <Text style={styles.name}>
          {name}
          {isMe ? ' (você)' : ''}
        </Text>
        {isOwner ? <Text style={styles.owner}>Proprietário</Text> : null}
      </View>
      {selected !== undefined ? (
        <View style={[styles.check, selected && styles.checked]}>{selected ? <Text style={styles.tick}>✓</Text> : null}</View>
      ) : null}
      {actionLabel && onAction ? (
        <Text style={styles.action} onPress={onAction}>
          {actionLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  info: { flex: 1 },
  name: { fontSize: 15, color: colors.text },
  owner: { fontSize: 12, color: colors.group, fontWeight: '600' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.primary },
  tick: { color: '#fff', fontWeight: '700' },
  action: { color: colors.danger, fontWeight: '600' },
});
