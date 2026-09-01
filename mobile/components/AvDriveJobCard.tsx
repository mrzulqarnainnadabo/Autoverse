import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import { AvDriveJob } from '../types/avDrive.types';

const STATUS_COLOR: Record<string, string> = {
  requested: colors.silver,
  accepted: colors.gold,
  in_progress: colors.warning,
  completed: colors.success,
  cancelled: colors.textSecondary,
  disputed: colors.critical,
};

function jobTypeLabel(t: string) {
  return t === 'intercity' ? 'Intercity' : 'Airport / hotel';
}

interface Props {
  job: AvDriveJob;
  onPress: (jobId: string) => void;
}

export default function AvDriveJobCard({ job, onPress }: Props) {
  const statusColor = STATUS_COLOR[job.status] || colors.silver;
  const when = new Date(job.scheduledAt).toLocaleString();

  return (
    <Pressable style={styles.card} onPress={() => onPress(job.id)}>
      <View style={styles.row}>
        <Text style={styles.type}>{jobTypeLabel(job.jobType)}</Text>
        <View style={[styles.badge, { borderColor: statusColor }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{job.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text style={styles.route} numberOfLines={2}>
        {job.geo.pickupLabel} → {job.geo.dropoffLabel}
      </Text>
      <Text style={styles.meta}>
        {when}
        {job.city ? ` · ${job.city}` : ''}
        {job.corridor ? ` · ${job.corridor}` : ''}
      </Text>
      {job.priceNgn != null && (
        <Text style={styles.price}>₦{job.priceNgn.toLocaleString()}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { ...typography.label, color: colors.gold },
  badge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
  route: { ...typography.body, color: colors.textPrimary, marginTop: spacing.sm },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  price: { ...typography.body, color: colors.gold, marginTop: spacing.sm, fontWeight: '600' },
});
