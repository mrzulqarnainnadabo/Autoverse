/**
 * Job detail: status timeline, signal buttons, chat / call / maps.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { openInGoogleMaps } from '../../components/AvDriveMapPicker';
import {
  acceptAvDriveJob,
  cancelAvDriveJob,
  completeAvDriveJob,
  fetchAvDriveJob,
  fetchAvDriveJobContact,
  fetchAvDriveJobEvents,
  rateAvDriveJob,
  signalAvDriveJob,
} from '../../services/avDriveApi';
import {
  AvDriveContact,
  AvDriveJob,
  AvDriveJobEvent,
  AvDriveStatusSignal,
} from '../../types/avDrive.types';

interface Props {
  jobId: string;
  /** Current user id — used to show owner vs client actions */
  currentUserId: string;
  onOpenConversation?: (conversationId: string) => void;
  onBack?: () => void;
}

export default function AvDriveJobDetailScreen({
  jobId,
  currentUserId,
  onOpenConversation,
  onBack,
}: Props) {
  const [job, setJob] = useState<AvDriveJob | null>(null);
  const [events, setEvents] = useState<AvDriveJobEvent[]>([]);
  const [contact, setContact] = useState<AvDriveContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [j, ev] = await Promise.all([
        fetchAvDriveJob(jobId),
        fetchAvDriveJobEvents(jobId),
      ]);
      setJob(j);
      setEvents(ev);
      if (j.status !== 'requested' || j.ownerId) {
        try {
          setContact(await fetchAvDriveJobContact(jobId));
        } catch {
          setContact(null);
        }
      }
    } catch (err: any) {
      Alert.alert('Job', err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err: any) {
      Alert.alert('Action failed', err.message || 'Try again');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !job) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const isOwner = job.ownerId === currentUserId;
  const isClient = job.clientId === currentUserId;
  const canAccept = isClient === false && job.status === 'requested'; // any partner viewing open job

  const ownerSignals: { signal: AvDriveStatusSignal; label: string }[] = [
    { signal: 'owner_on_the_way', label: 'On the way' },
    { signal: 'owner_arrived', label: "I've arrived" },
    { signal: 'trip_started', label: 'Start trip' },
    { signal: 'trip_completed', label: 'Complete' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.gold} />}
    >
      {onBack && (
        <Pressable onPress={onBack} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.link}>← Back</Text>
        </Pressable>
      )}

      <Text style={styles.kicker}>{job.jobType === 'intercity' ? 'INTERCITY' : 'AIRPORT / HOTEL'}</Text>
      <Text style={styles.title}>
        {job.geo.pickupLabel} → {job.geo.dropoffLabel}
      </Text>
      <Text style={styles.meta}>
        Status: {job.status.replace('_', ' ')} · {new Date(job.scheduledAt).toLocaleString()}
      </Text>

      <View style={styles.mapLinks}>
        {job.geo.pickupLat != null && job.geo.pickupLng != null && (
          <Pressable
            onPress={() => openInGoogleMaps(job.geo.pickupLat!, job.geo.pickupLng!, job.geo.pickupLabel)}
          >
            <Text style={styles.link}>Navigate to pickup</Text>
          </Pressable>
        )}
        {job.geo.dropoffLat != null && job.geo.dropoffLng != null && (
          <Pressable
            onPress={() =>
              openInGoogleMaps(job.geo.dropoffLat!, job.geo.dropoffLng!, job.geo.dropoffLabel)
            }
          >
            <Text style={styles.link}>Navigate to drop-off</Text>
          </Pressable>
        )}
      </View>

      {/* Communication */}
      <Text style={styles.section}>Communicate</Text>
      <View style={styles.btnRow}>
        {job.conversationId && onOpenConversation && (
          <Pressable
            style={styles.btnOutline}
            onPress={() => onOpenConversation(job.conversationId!)}
          >
            <Text style={styles.btnOutlineText}>Open chat</Text>
          </Pressable>
        )}
        {contact?.telUrl && (
          <Pressable style={styles.btnOutline} onPress={() => Linking.openURL(contact.telUrl!)}>
            <Text style={styles.btnOutlineText}>Call</Text>
          </Pressable>
        )}
        {contact?.whatsappUrl && (
          <Pressable
            style={styles.btnOutline}
            onPress={() => Linking.openURL(contact.whatsappUrl!)}
          >
            <Text style={styles.btnOutlineText}>WhatsApp</Text>
          </Pressable>
        )}
      </View>
      {!contact && job.status === 'requested' && (
        <Text style={styles.hint}>Phone & chat unlock after a partner accepts.</Text>
      )}

      {/* Actions */}
      <Text style={styles.section}>Actions</Text>
      {busy && <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.sm }} />}

      {canAccept && !isOwner && (
        <Pressable
          style={styles.btnPrimary}
          disabled={busy}
          onPress={() => run(async () => { await acceptAvDriveJob(jobId); })}
        >
          <Text style={styles.btnPrimaryText}>Accept job</Text>
        </Pressable>
      )}

      {isOwner && job.status !== 'completed' && job.status !== 'cancelled' && (
        <View style={styles.signalGrid}>
          {ownerSignals.map((s) => (
            <Pressable
              key={s.signal}
              style={styles.signalBtn}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  if (s.signal === 'trip_completed') await completeAvDriveJob(jobId);
                  else await signalAvDriveJob(jobId, s.signal);
                })
              }
            >
              <Text style={styles.signalText}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {isClient && job.status === 'accepted' && (
        <Pressable
          style={styles.signalBtn}
          disabled={busy}
          onPress={() => run(async () => { await signalAvDriveJob(jobId, 'client_ready'); })}
        >
          <Text style={styles.signalText}>I'm ready at pickup</Text>
        </Pressable>
      )}

      {isClient && job.status === 'completed' && (
        <View style={styles.rateRow}>
          {[5, 4, 3].map((stars) => (
            <Pressable
              key={stars}
              style={styles.signalBtn}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await rateAvDriveJob(jobId, stars);
                  Alert.alert('Thanks', `Rated ${stars} stars`);
                })
              }
            >
              <Text style={styles.signalText}>Rate {stars}★</Text>
            </Pressable>
          ))}
        </View>
      )}

      {(isOwner || isClient) && job.status !== 'completed' && job.status !== 'cancelled' && (
        <Pressable
          style={styles.cancelBtn}
          disabled={busy}
          onPress={() =>
            Alert.alert('Cancel job?', undefined, [
              { text: 'No', style: 'cancel' },
              {
                text: 'Cancel job',
                style: 'destructive',
                onPress: () => run(async () => { await cancelAvDriveJob(jobId); }),
              },
            ])
          }
        >
          <Text style={styles.cancelText}>Cancel job</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Timeline</Text>
      {events.length === 0 ? (
        <Text style={styles.hint}>No events yet.</Text>
      ) : (
        events.map((e) => (
          <View key={e.id} style={styles.eventRow}>
            <Text style={styles.eventType}>{e.signal || e.eventType}</Text>
            <Text style={styles.eventTime}>{new Date(e.createdAt).toLocaleString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...typography.label, color: colors.gold },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  mapLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  link: { ...typography.caption, color: colors.gold, fontWeight: '600' },
  section: { ...typography.label, color: colors.gold, marginTop: spacing.xl, marginBottom: spacing.sm },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  btnOutlineText: { color: colors.gold, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnPrimaryText: { color: colors.background, fontWeight: '700' },
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  signalBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  signalText: { color: colors.textPrimary, fontWeight: '600' },
  rateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cancelBtn: { marginTop: spacing.md, alignItems: 'center', padding: spacing.sm },
  cancelText: { color: colors.critical, fontWeight: '600' },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventType: { ...typography.body, color: colors.textPrimary, textTransform: 'capitalize' },
  eventTime: { ...typography.caption, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textSecondary },
});
