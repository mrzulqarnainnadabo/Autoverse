/**
 * AUTOVERSE — Search Screen
 *
 * Debounced search-as-you-type + filter chips, all funneled into one
 * `SearchFilters` object that maps 1:1 onto the backend query params —
 * no client-side filtering of a full dataset, every change re-queries
 * the (indexed) `public_listings` view so results stay accurate as
 * inventory changes in real time.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { NIGERIAN_STATES } from '../constants/nigeria';
import Chip from '../components/Chip';
import BuyerListingCard from '../components/BuyerListingCard';
import { searchListings } from '../services/buyerApi';
import { SearchFilters, SearchResultItem, SortOption, ConditionFilter } from '../types/search.types';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  ai_score: 'AI Score',
};

const CONDITION_LABELS: Record<ConditionFilter, string> = {
  any: 'Any condition',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
};

const PRICE_PRESETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Under ₦5M', max: 5_000_000 },
  { label: '₦5M–₦10M', min: 5_000_000, max: 10_000_000 },
  { label: '₦10M–₦20M', min: 10_000_000, max: 20_000_000 },
  { label: '₦20M+', min: 20_000_000 },
];

const DEBOUNCE_MS = 400;
const CONTENT_PADDING = spacing.lg;
const GRID_GUTTER = spacing.sm;

interface Props {
  onOpenListing: (vehicleId: string) => void;
}

export default function SearchScreen({ onOpenListing }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const columns = isTablet ? 3 : 2;
  const cardWidth = (width - CONTENT_PADDING * 2 - GRID_GUTTER * (columns - 1)) / columns;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({ sort: 'newest', condition: 'any' });
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string, activeFilters: SearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await searchListings({ ...activeFilters, q: q || undefined });
      setResults(response.results);
      setTotalCount(response.totalCount);
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search-as-you-type
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query, filters);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filters, runSearch]);

  const updateFilter = useCallback(<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const togglePricePreset = useCallback(
    (preset: { min?: number; max?: number }) => {
      const isActive = filters.priceMin === preset.min && filters.priceMax === preset.max;
      setFilters((prev) => ({
        ...prev,
        priceMin: isActive ? undefined : preset.min,
        priceMax: isActive ? undefined : preset.max,
      }));
    },
    [filters]
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search make, model, or year (e.g. Toyota Camry 2019)"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
        />
        <Pressable style={styles.filterToggle} onPress={() => setShowFilters((v) => !v)}>
          <Text style={styles.filterToggleText}>{showFilters ? 'Hide filters' : 'Filters'}</Text>
        </Pressable>
      </View>

      {showFilters && (
        <ScrollView style={styles.filtersPanel} contentContainerStyle={{ paddingBottom: spacing.md }}>
          <Text style={styles.filterLabel}>Condition</Text>
          <View style={styles.chipRow}>
            {(Object.keys(CONDITION_LABELS) as ConditionFilter[]).map((c) => (
              <Chip
                key={c}
                label={CONDITION_LABELS[c]}
                active={(filters.condition ?? 'any') === c}
                onPress={() => updateFilter('condition', c)}
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>Price range</Text>
          <View style={styles.chipRow}>
            {PRICE_PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                active={filters.priceMin === preset.min && filters.priceMax === preset.max}
                onPress={() => togglePricePreset(preset)}
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <Chip
                label="All states"
                active={!filters.state}
                onPress={() => updateFilter('state', undefined)}
              />
              {NIGERIAN_STATES.map((state) => (
                <Chip
                  key={state}
                  label={state}
                  active={filters.state === state}
                  onPress={() => updateFilter('state', filters.state === state ? undefined : state)}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.filterLabel}>Sort by</Text>
          <View style={styles.chipRow}>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <Chip
                key={s}
                label={SORT_LABELS[s]}
                active={(filters.sort ?? 'newest') === s}
                onPress={() => updateFilter('sort', s)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* Result count */}
      <View style={styles.resultCountRow}>
        <Text style={styles.resultCountText}>
          {loading ? 'Searching…' : `${totalCount.toLocaleString('en-NG')} vehicles found`}
        </Text>
      </View>

      {/* Results */}
      {loading && results.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No vehicles match your search. Try adjusting your filters.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultsGrid}>
          {results.map((listing) => (
            <BuyerListingCard
              key={listing.vehicleId}
              listing={listing}
              width={cardWidth}
              onPress={onOpenListing}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBarWrap: {
    flexDirection: 'row',
    padding: CONTENT_PADDING,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
  },
  filterToggle: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  filterToggleText: { color: colors.gold, fontWeight: '600', fontSize: 13 },
  filtersPanel: {
    maxHeight: 320,
    paddingHorizontal: CONTENT_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  resultCountRow: { paddingHorizontal: CONTENT_PADDING, paddingVertical: spacing.sm },
  resultCountText: { ...typography.caption, color: colors.textSecondary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { ...typography.body, color: colors.critical, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: CONTENT_PADDING,
    paddingBottom: spacing.xl,
  },
});
