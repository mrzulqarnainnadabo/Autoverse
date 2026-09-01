/**
 * AV Drive — entry hub for owners (earn) and clients (book).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { fetchMyAvDriveProfile, fetchMyAvDriveJobs } from '../../services/avDriveApi';
import { AvDriveJob, AvDriveProfile } from '../../types/avDrive.types';
import AvDriveJobCard from '../../components/AvDriveJobCard';

interface Props {
  onBook: () => void;
  onEarnSetup: () => void;
  onOpenJobs: () => void;
  onOpenJob: (jobId: string) => void;
}

export default function AvDriveHomeScreen({
  onBook,
  onEarnSetup,
  onOpenJobs,
  onOpenJob,
}: Props) {
  const [profile, setProfile] = useState<AvDriveProfile | null>(null);
  const [jobs, setJobs] = useState<AvDriveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, j] = await Promise.all([fetchMyAvDriveProfile(), fetchMyAvDriveJobs()]);
      setProfile(p);
      setJobs(j.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Could not load AV Drive.');
    } finally {
      setLoading(false);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.gold} />}
    >
      <Text style={styles.kicker}>AV DRIVE</Text>
      <Text style={styles.title}>Earn with a verified car. Book with trust.</Text>
      <Text style={styles.subtitle}>
        Structured private hire in Abuja & Kaduna — airport transfers and Abuja↔Kaduna. Not street
        hailing.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.ctaRow}>
        <Pressable style={styles.ctaPrimary} onPress={onBook}>
          <Text style={styles.ctaPrimaryText}>Book a car</Text>
        </Pressable>
        <Pressable style={styles.ctaSecondary} onPress={onEarnSetup}>
          <Text style={styles.ctaSecondaryText}>
            {profile ? 'Earn settings' : 'Start earning'}
          </Text>
        </Pressable>
      </View>

      {profile && (
        <View style={styles.profileCard}>
          <Text style={styles.profileTitle}>Your partner profile</Text>
          <Text style={styles.profileLine}>
            {profile.homeCity} · {profile.workReady ? 'Work-ready' : 'Setup incomplete'} ·{' '}
            {profile.isAvailable ? 'Available' : 'Offline'}
          </Text>
          <Text style={styles.profileLine}>
            Rating {profile.ratingAvg.toFixed(1)} ({profile.ratingCount})
          </Text>
        </View>
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent jobs</Text>
        <Pressable onPress={onOpenJobs}>
          <Text style={styles.link}>See all</Text>
        </Pressable>
      </View>

      {jobs.length === 0 ? (
        <Text style={styles.empty}>No jobs yet. Book a transfer or go available to earn.</Text>
      ) : (
        jobs.map((job) => <AvDriveJobCard key={job.id} job={job} onPress={onOpenJob} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...typography.label, color: colors.gold },
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 22 },
  error: { ...typography.body, color: colors.critical, marginTop: spacing.md },
  ctaRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  ctaPrimary: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaPrimaryText: { color: colors.background, fontWeight: '700', fontSize: 15 },
  ctaSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaSecondaryText: { color: colors.gold, fontWeight: '700', fontSize: 15 },
  profileCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  profileTitle: { ...typography.label, color: colors.gold },
  profileLine: { ...typography.body, color: colors.textPrimary, marginTop: spacing.xs },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h2, color: colors.textPrimary },
  link: { ...typography.caption, color: colors.gold, fontWeight: '600' },
  empty: { ...typography.body, color: colors.textSecondary },
});
