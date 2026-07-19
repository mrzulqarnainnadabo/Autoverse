import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { PublicListingDetail } from '../types/search.types';

interface Props {
  dealer: PublicListingDetail['dealer'];
  onMessage: () => void;
  onCall: () => void;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <Text style={styles.stars}>
      {'★'.repeat(full)}
      <Text style={styles.starsEmpty}>{'★'.repeat(5 - full)}</Text>
    </Text>
  );
}

export default function DealerInfoCard({ dealer, onMessage, onCall }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{dealer.businessName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{dealer.businessName}</Text>
            {dealer.verified && <Text style={styles.verifiedTick}>✓</Text>}
          </View>
          {dealer.ratingCount > 0 ? (
            <View style={styles.ratingRow}>
              <Stars rating={dealer.ratingAvg} />
              <Text style={styles.ratingText}>
                {dealer.ratingAvg.toFixed(1)} ({dealer.ratingCount} reviews)
              </Text>
            </View>
          ) : (
            <Text style={styles.newDealerText}>New on AUTOVERSE</Text>
          )}
        </View>
      </View>

      {dealer.verified && (
        <View style={styles.trustNote}>
          <Text style={styles.trustNoteText}>
            ✓ Identity and business registration verified by AUTOVERSE
          </Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable style={styles.messageButton} onPress={onMessage}>
          <Text style={styles.messageButtonText}>Message Dealer</Text>
        </Pressable>
        <Pressable style={styles.callButton} onPress={onCall}>
          <Text style={styles.callButtonText}>Call</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: colors.gold, fontWeight: '800', fontSize: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '700', flexShrink: 1 },
  verifiedTick: { color: colors.gold, marginLeft: spacing.xs, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  stars: { color: colors.gold, fontSize: 13, letterSpacing: 1 },
  starsEmpty: { color: colors.border },
  ratingText: { ...typography.caption, color: colors.textSecondary, marginLeft: spacing.xs },
  newDealerText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  trustNote: {
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderRadius: 10,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  trustNoteText: { ...typography.caption, color: colors.gold },
  actionRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  messageButton: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  messageButtonText: { color: colors.background, fontWeight: '700' },
  callButton: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  callButtonText: { color: colors.gold, fontWeight: '700' },
});
