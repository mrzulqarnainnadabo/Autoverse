import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { fetchVerificationQueue } from '../../services/verificationApi';
import { VerificationQueueItem } from '../../types/verification.types';
import { timeAgo } from '../../utils/formatTime';

interface Props {
  onOpenSubmission: (submissionId: string) => void;
}

const DOC_LABELS: Record<string, string> = {
  nin: 'NIN',
  drivers_license: "Driver's License",
  international_passport: 'Int\'l Passport',
  voters_card: "Voter's Card",
};

export default function VerificationQueueScreen({ onOpenSubmission }: Props) {
  const [queue, setQueue] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setQueue(await fetchVerificationQueue());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verification Queue</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{queue.length} pending</Text>
        </View>
      </View>

      {queue.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No pending submissions. All caught up.</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.submissionId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onOpenSubmission(item.submissionId)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.businessName}>{item.businessName}</Text>
                <Text style={styles.meta}>
                  {DOC_LABELS[item.idDocumentType]} · Submitted {timeAgo(item.submittedAt)}
                </Text>
              </View>
              <Text style={styles.chevron}>→</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  countBadge: { backgroundColor: colors.gold, borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: 2, marginLeft: spacing.sm },
  countBadgeText: { color: colors.background, fontWeight: '700', fontSize: 12 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  businessName: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  chevron: { color: colors.gold, fontSize: 16, marginLeft: spacing.sm },
});
