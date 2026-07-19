/**
 * AUTOVERSE — BuyerListingCard
 * The buyer-facing sibling of the dealer dashboard's ListingCard —
 * same visual language (grade badge, price emphasis, rounded surface)
 * but swaps dealer-only metrics (views/inquiries) for what a buyer
 * actually needs to decide: location and dealer trust signal.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography, gradeColor } from '../constants/theme';
import { SearchResultItem } from '../types/search.types';

interface Props {
  listing: SearchResultItem;
  width: number;
  onPress?: (vehicleId: string) => void;
}

function formatNGN(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default function BuyerListingCard({ listing, width, onPress }: Props) {
  return (
    <Pressable style={[styles.card, { width }]} onPress={() => onPress?.(listing.vehicleId)}>
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
        {listing.dealerVerified && (
          <View style={styles.verifiedPill}>
            <Text style={styles.verifiedPillText}>✓ Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.year} {listing.make} {listing.model}
        </Text>
        <Text style={styles.price}>{formatNGN(listing.priceNGN)}</Text>
        <Text style={styles.mileage}>{listing.mileageKm.toLocaleString('en-NG')} km</Text>
        <Text style={styles.location} numberOfLines={1}>
          {listing.lga ? `${listing.lga}, ` : ''}{listing.state || 'Nigeria'}
        </Text>
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
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  gradeBadgeText: { fontWeight: '800', fontSize: 14 },
  verifiedPill: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    backgroundColor: 'rgba(10,10,10,0.75)', borderRadius: 20,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  verifiedPillText: { color: colors.gold, fontSize: 10, fontWeight: '700' },
  body: { padding: spacing.md },
  title: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  price: { ...typography.h2, color: colors.gold, marginTop: spacing.xs },
  mileage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  location: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
