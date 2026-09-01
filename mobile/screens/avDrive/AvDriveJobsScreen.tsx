import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import AvDriveJobCard from '../../components/AvDriveJobCard';
import { fetchMyAvDriveJobs } from '../../services/avDriveApi';
import { AvDriveJob } from '../../types/avDrive.types';

interface Props {
  onOpenJob: (jobId: string) => void;
}

export default function AvDriveJobsScreen({ onOpenJob }: Props) {
  const [jobs, setJobs] = useState<AvDriveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const list = await fetchMyAvDriveJobs();
      setJobs(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
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
        <Text style={styles.title}>AV Drive jobs</Text>
      </View>
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AvDriveJobCard job={item} onPress={onOpenJob} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No jobs yet.</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.gold} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  list: { padding: spacing.lg },
  error: { ...typography.body, color: colors.critical, textAlign: 'center' },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
});
