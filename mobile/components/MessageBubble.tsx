import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { Message } from '../types/messaging.types';
import { clockTime } from '../utils/formatTime';

interface Props {
  message: Message;
  isMine: boolean;
}

export default function MessageBubble({ message, isMine }: Props) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.body, isMine ? styles.bodyMine : styles.bodyTheirs]}>{message.body}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.time, isMine && styles.timeMine]}>{clockTime(message.createdAt)}</Text>
          {isMine && (
            <Text style={[styles.receipt, message.readAt && styles.receiptRead]}>
              {message.readAt ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: spacing.md },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.gold, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  body: { ...typography.body, lineHeight: 20 },
  bodyMine: { color: colors.background },
  bodyTheirs: { color: colors.textPrimary },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  time: { fontSize: 10, color: colors.textSecondary },
  timeMine: { color: 'rgba(10,10,10,0.6)' },
  receipt: { fontSize: 11, color: 'rgba(10,10,10,0.5)' },
  receiptRead: { color: colors.background, fontWeight: '700' },
});
