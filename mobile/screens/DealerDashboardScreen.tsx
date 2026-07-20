/**
 * AUTOVERSE — Dealer Dashboard Screen
 *
 * The dealer's command center: verification status, performance stats,
 * inventory with live AutoInspect scores, and incoming buyer inquiries.
 * Responsive across phone/tablet via useWindowDimensions — stat cards
 * go 2-up on phones, 4-up on tablets; listings go 1-up / 2-up.
 */

import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { fetchDealerDashboard } from '../services/dealerApi';
import { DealerDashboardResponse, DealerInquiryItem, DealerListingItem } from '../types/dealer.types';
import StatCard from '../components/StatCard';
import ListingCard from '../components/ListingCard';
import InquiryRow from '../components/InquiryRow';

interface Props {
  dealerId: string;
  onOpenListing?: (vehicleId: string) => void;
  onOpenInquiry?: (inquiry: DealerInquiryItem) => void;
  onAddListing?: () => void;
  onOpenVerification?: () => void;
}

/**
 * Imperative handle so a parent screen (e.g. after SellScreen publishes
 * a listing) can refresh this dashboard without prop-drilling a reload
 * signal or depending on a specific navigation library's focus events.
 */
export interface DealerDashboardHandle {
  refresh: () => void;
  /** Instantly show a just-published listing before the network refetch lands. */
  prependListing: (listing: DealerListingItem) => void;
}

const GRID_GUTTER = spacing.sm;
const CONTENT_PADDING = spacing.lg;

function DealerDashboardScreenInner(
  { dealerId, onOpenListing, onOpenInquiry, onAddListing, onOpenVerification }: Props,
  ref: React.Ref<DealerDashboardHandle>
) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [data, setData] = useState<DealerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await fetchDealerDashboard(dealerId);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dealerId]);

  useImperativeHandle(ref, () => ({
    refresh: () => load(true),
    prependListing: (listing: DealerListingItem) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          summary: {
            ...prev.summary,
            activeListings:
              listing.status === 'active' ? prev.summary.activeListings + 1 : prev.summary.activeListings,
          },
          listings: [listing, ...prev.listings.filter((l) => l.vehicleId !== listing.vehicleId)],
        };
      });
      // Reconcile with the server shortly after — the optimistic entry
      // above may be missing derived fields (AutoInspect score timing,
      // exact view counts) that only the aggregation view computes.
      load(true);
    },
  }), [load]);


  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Dealer not found.'}</Text>
        <Pressable style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const { summary, listings, recentInquiries } = data;

  // Responsive grid math
  const statColumns = isTablet ? 4 : 2;
  const statCardWidth =
    (width - CONTENT_PADDING * 2 - GRID_GUTTER * (statColumns - 1)) / statColumns;

  const listingColumns = isTablet ? 2 : 1;
  const listingCardWidth =
    (width - CONTENT_PADDING * 2 - GRID_GUTTER * (listingColumns - 1)) / listingColumns;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: CONTENT_PADDING, paddingBottom: spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dealerName}>{summary.businessName}</Text>
          <Pressable onPress={onOpenVerification} disabled={summary.verificationStatus === 'verified'}>
            <VerificationBadge status={summary.verificationStatus} />
          </Pressable>
        </View>
        <Pressable style={styles.addButton} onPress={onAddListing}>
          <Text style={styles.addButtonText}>+ Add Listing</Text>
        </Pressable>
      </View>

      {/* Stat grid */}
      <View style={styles.grid}>
        <StatCard label="Active Listings" value={String(summary.activeListings)} width={statCardWidth} />
        <StatCard label="Sold This Month" value={String(summary.soldThisMonth)} accent="gold" width={statCardWidth} />
        <StatCard label="Views (30d)" value={summary.totalViews30d.toLocaleString('en-NG')} width={statCardWidth} />
        <StatCard
          label="New Inquiries"
          value={String(summary.newInquiries)}
          accent={summary.newInquiries > 0 ? 'warning' : 'default'}
          width={statCardWidth}
        />
        <StatCard
          label="Avg AutoInspect Score"
          value={summary.avgAutoInspectScore !== null ? `${summary.avgAutoInspectScore}` : '—'}
          accent="success"
          width={statCardWidth}
        />
        <StatCard label="Inquiries (30d)" value={String(summary.totalInquiries30d)} width={statCardWidth} />
      </View>

      {/* Recent inquiries */}
      <SectionHeader title="Recent Inquiries" />
      {recentInquiries.length === 0 ? (
        <EmptyState message="No inquiries yet. Buyers will appear here as soon as they reach out." />
      ) : (
        <View style={styles.card}>
          {recentInquiries.map((inquiry) => (
            <InquiryRow key={inquiry.id} inquiry={inquiry} onPress={onOpenInquiry} />
          ))}
        </View>
      )}

      {/* Listings */}
      <SectionHeader title={`Inventory (${listings.length})`} />
      {listings.length === 0 ? (
        <EmptyState message="No listings yet. Tap “+ Add Listing” to get your first vehicle live." />
      ) : (
        <View style={styles.grid}>
          {listings.map((listing) => (
            <ListingCard
              key={listing.vehicleId}
              listing={listing}
              width={listingCardWidth}
              onPress={onOpenListing}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const DealerDashboardScreen = forwardRef(DealerDashboardScreenInner);
DealerDashboardScreen.displayName = 'DealerDashboardScreen';
export default DealerDashboardScreen;

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

function VerificationBadge({ status }: { status: 'pending' | 'verified' | 'rejected' }) {
  if (status === 'verified') {
    return (
      <View style={styles.badgeRow}>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>✓ Verified Dealer</Text>
        </View>
      </View>
    );
  }
  if (status === 'pending') {
    return (
      <View style={styles.badgeRow}>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Verification Pending</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.badgeRow}>
      <View style={styles.rejectedBadge}>
        <Text style={styles.rejectedBadgeText}>Verification Needs Attention</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { ...typography.body, color: colors.critical, textAlign: 'center', marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: colors.background, fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  dealerName: { ...typography.h1, color: colors.textPrimary },
  badgeRow: { flexDirection: 'row', marginTop: spacing.xs },
  verifiedBadge: { backgroundColor: 'rgba(212,175,55,0.12)', borderColor: colors.gold, borderWidth: 1, borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  verifiedBadgeText: { ...typography.caption, color: colors.gold, fontWeight: '700' },
  pendingBadge: { backgroundColor: 'rgba(224,165,38,0.12)', borderColor: colors.warning, borderWidth: 1, borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  pendingBadgeText: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  rejectedBadge: { backgroundColor: 'rgba(214,69,69,0.12)', borderColor: colors.critical, borderWidth: 1, borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  rejectedBadgeText: { ...typography.caption, color: colors.critical, fontWeight: '700' },

  addButton: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addButtonText: { color: colors.background, fontWeight: '700', fontSize: 13 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  sectionHeader: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
