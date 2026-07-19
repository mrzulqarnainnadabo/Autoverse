import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography, gradeColor } from '../constants/theme';
import { DealerListingItem } from '../types/dealer.types';

interface Props {
  listing: DealerListingItem;
  width: number;
  onPress?: (vehicleId: string) => void;
}

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  sold: 'Sold',
  archived: 'Archived',
};

const statusColor: Record<string, string> = {
  draft: colors.textSecondary,
  active: colors.success,
  sold: colors.gold,
  archived: colors.textSecondary,
};

function formatNGN(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default function ListingCard({ listing, width, onPress }: Props) {
  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={() => onPress?.(listing.vehicleId)}
    >
      <View style={styles.imageWrap}>
        {listing.primaryImageUrl ? (
          <Image source={{ uri: listing.primaryImageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>AV</Text>
          </View>
        )}
        {listing.autoInspectGrade && (
          <View style={[styles.gradeBadge, { borderColor: gradeColor[listing.autoInspectGrade] }]}>
            <Text style={[styles.gradeBadgeText, { color: gradeColor[listing.autoInspectGrade] }]}>
              {listing.autoInspectGrade}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.year} {listing.make} {listing.model}
        </Text>
        <Text style={styles.price}>{formatNGN(listing.priceNGN)}</Text>
        <Text style={styles.mileage}>{listing.mileageKm.toLocaleString('en-NG')} km</Text>

        <View style={styles.footerRow}>
          <View style={[styles.statusPill, { borderColor: statusColor[listing.status] }]}>
            <Text style={[styles.statusPillText, { color: statusColor[listing.status] }]}>
              {statusLabel[listing.status]}
            </Text>
          </View>
          <Text style={styles.metrics}>
            {listing.views30d} views · {listing.inquiries30d} inquiries
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  imageWrap: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surfaceElevated },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: colors.goldMuted, fontWeight: '800', fontSize: 20, letterSpacing: 2 },
  gradeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadgeText: { fontWeight: '800', fontSize: 14 },
  body: { padding: spacing.md },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  price: { ...typography.h2, color: colors.gold, marginTop: spacing.xs },
  mileage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusPillText: { ...typography.caption, fontWeight: '700' },
  metrics: { ...typography.caption, color: colors.textSecondary },
});
