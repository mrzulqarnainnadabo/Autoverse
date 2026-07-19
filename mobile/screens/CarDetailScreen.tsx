/**
 * AUTOVERSE — Car Detail Screen
 *
 * The conversion moment: photo carousel → trust signals → price →
 * specs → financing → dealer contact. Every section here exists to
 * move a browsing buyer toward "Message Dealer" or "Call" with
 * confidence, which is why AutoInspect and the verified-dealer badge
 * sit above the fold, immediately after the photos.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking, Alert } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import PhotoCarousel from '../components/PhotoCarousel';
import InspectionSummaryCard from '../components/InspectionSummaryCard';
import FinancingCalculator from '../components/FinancingCalculator';
import DealerInfoCard from '../components/DealerInfoCard';
import MessageComposeModal from '../components/MessageComposeModal';
import { fetchListingDetail } from '../services/buyerApi';
import { PublicListingDetail } from '../types/search.types';

interface Props {
  vehicleId: string;
  onViewFullReport?: (reportId: string) => void;
  onOpenConversation?: (conversationId: string) => void;
}

function formatNGN(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const SPEC_ROWS: Array<{ key: keyof PublicListingDetail; label: string; format?: (v: any) => string }> = [
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year' },
  { key: 'mileageKm', label: 'Mileage', format: (v: number) => `${v.toLocaleString('en-NG')} km` },
  { key: 'transmission', label: 'Transmission', format: (v: string) => (v === 'automatic' ? 'Automatic' : 'Manual') },
  { key: 'fuelType', label: 'Fuel Type', format: (v: string) => v[0].toUpperCase() + v.slice(1) },
  { key: 'state', label: 'Location', format: (v: string, listing?: PublicListingDetail) => (listing?.lga ? `${listing.lga}, ${v}` : v) },
];

export default function CarDetailScreen({ vehicleId, onViewFullReport, onOpenConversation }: Props) {
  const [listing, setListing] = useState<PublicListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageSentBanner, setMessageSentBanner] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchListingDetail(vehicleId);
      setListing(detail);
    } catch (err: any) {
      setError(err.message || 'This listing could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCall = useCallback(() => {
    if (!listing?.dealer.phone) {
      Alert.alert('No phone number available', 'Try messaging this dealer instead.');
      return;
    }
    Linking.openURL(`tel:${listing.dealer.phone}`);
  }, [listing]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const vehicleLabel = `${listing.year} ${listing.make} ${listing.model}`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <PhotoCarousel photos={listing.photos} />

        <View style={styles.content}>
          {/* Trust badges row */}
          <View style={styles.badgeRow}>
            {listing.dealer.verified && (
              <View style={styles.trustBadge}>
                <Text style={styles.trustBadgeText}>✓ Verified Dealer</Text>
              </View>
            )}
            {listing.autoInspect && (
              <View style={styles.trustBadge}>
                <Text style={styles.trustBadgeText}>
                  AI AutoInspect: {listing.autoInspect.grade} ({listing.autoInspect.overallScore})
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{vehicleLabel}</Text>
          <Text style={styles.price}>{formatNGN(listing.priceNGN)}</Text>

          {listing.autoInspect && (
            <View style={styles.section}>
              <InspectionSummaryCard
                autoInspect={listing.autoInspect}
                onViewFullReport={() => onViewFullReport?.(listing.autoInspect!.reportId)}
              />
            </View>
          )}

          {/* Specification table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            <View style={styles.specTable}>
              {SPEC_ROWS.map((row) => {
                const rawValue = (listing as any)[row.key];
                if (rawValue === null || rawValue === undefined) return null;
                const displayValue = row.format ? row.format(rawValue, listing) : String(rawValue);
                return (
                  <View key={row.label} style={styles.specRow}>
                    <Text style={styles.specLabel}>{row.label}</Text>
                    <Text style={styles.specValue}>{displayValue}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {listing.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          )}

          {/* Financing */}
          <View style={styles.section}>
            <FinancingCalculator priceNGN={listing.priceNGN} />
          </View>

          {/* Dealer */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <DealerInfoCard
              dealer={listing.dealer}
              onMessage={() => setMessageModalVisible(true)}
              onCall={handleCall}
            />
          </View>
        </View>
      </ScrollView>

      {messageSentBanner && (
        <View style={styles.sentBanner}>
          <Text style={styles.sentBannerText}>✓ Message sent — the dealer will reach out to you directly.</Text>
        </View>
      )}

      <MessageComposeModal
        visible={messageModalVisible}
        vehicleId={vehicleId}
        vehicleLabel={vehicleLabel}
        onClose={() => setMessageModalVisible(false)}
        onSent={(conversationId) => {
          setMessageSentBanner(true);
          setTimeout(() => setMessageSentBanner(false), 4000);
          onOpenConversation?.(conversationId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { ...typography.body, color: colors.critical, textAlign: 'center', marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: colors.background, fontWeight: '700' },
  content: { padding: spacing.lg },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  trustBadge: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  trustBadgeText: { ...typography.caption, color: colors.gold, fontWeight: '700' },
  title: { ...typography.h1, color: colors.textPrimary },
  price: { ...typography.h1, color: colors.gold, fontSize: 32, marginTop: spacing.xs },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
  specTable: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specLabel: { ...typography.body, color: colors.textSecondary },
  specValue: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  description: { ...typography.body, color: colors.textPrimary, lineHeight: 22 },
  sentBanner: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: spacing.md,
  },
  sentBannerText: { color: colors.background, fontWeight: '700', textAlign: 'center' },
});
