import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { ConversationSummary } from '../types/messaging.types';
import { timeAgo } from '../utils/formatTime';

interface Props {
  conversation: ConversationSummary;
  onPress: (conversationId: string) => void;
}

export default function ConversationListItem({ conversation, onPress }: Props) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Pressable style={styles.row} onPress={() => onPress(conversation.conversationId)}>
      <View style={styles.thumbWrap}>
        {conversation.vehicle.primaryImageUrl ? (
          <Image source={{ uri: conversation.vehicle.primaryImageUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbPlaceholderText}>AV</Text>
          </View>
        )}
      </View>

      <View style={styles.textBlock}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
            {conversation.otherParticipant.name}
          </Text>
          <Text style={styles.time}>{timeAgo(conversation.lastMessageAt)}</Text>
        </View>
        <Text style={styles.vehicleTitle} numberOfLines={1}>{conversation.vehicle.title}</Text>
        <View style={styles.previewRow}>
          <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
            {conversation.lastMessage?.body || 'Say hello to get started'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumbWrap: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', marginRight: spacing.md },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { color: colors.goldMuted, fontWeight: '800', fontSize: 12 },
  textBlock: { flex: 1, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flexShrink: 1 },
  nameUnread: { fontWeight: '800' },
  time: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
  vehicleTitle: { ...typography.caption, color: colors.gold, marginTop: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  preview: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  previewUnread: { color: colors.textPrimary, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: spacing.sm,
  },
  unreadBadgeText: { color: colors.background, fontSize: 11, fontWeight: '800' },
});
