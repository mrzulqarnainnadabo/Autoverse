import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { DealerInquiryItem } from '../types/dealer.types';

interface Props {
  inquiry: DealerInquiryItem;
  onPress?: (inquiry: DealerInquiryItem) => void;
}

const statusColor: Record<string, string> = {
  new: colors.gold,
  contacted: colors.silver,
  closed: colors.textSecondary,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InquiryRow({ inquiry, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={() => onPress?.(inquiry)}>
      <View style={[styles.statusDot, { backgroundColor: statusColor[inquiry.status] }]} />
      <View style={styles.textBlock}>
        <Text style={styles.buyerName}>{inquiry.buyerName}</Text>
        <Text style={styles.vehicleLabel} numberOfLines={1}>{inquiry.vehicleLabel}</Text>
        {inquiry.message && (
          <Text style={styles.message} numberOfLines={1}>{inquiry.message}</Text>
        )}
      </View>
      <Text style={styles.time}>{timeAgo(inquiry.createdAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  textBlock: { flex: 1 },
  buyerName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  vehicleLabel: { ...typography.caption, color: colors.gold, marginTop: 1 },
  message: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  time: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.sm },
});
