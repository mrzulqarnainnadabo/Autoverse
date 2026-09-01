/** Client: book airport or intercity with map pins. */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import Chip from '../../components/Chip';
import AvDriveMapPicker, { GeoPoint } from '../../components/AvDriveMapPicker';
import { createAvDriveJob, fetchAvDrivePartners } from '../../services/avDriveApi';
import {
  AvDriveCity,
  AvDriveJobType,
  AvDrivePartnerPublic,
} from '../../types/avDrive.types';

interface Props {
  onBooked: (jobId: string) => void;
}

export default function AvDriveBookScreen({ onBooked }: Props) {
  const [jobType, setJobType] = useState<AvDriveJobType>('airport_transfer');
  const [city, setCity] = useState<AvDriveCity>('Abuja');
  const [pickup, setPickup] = useState<GeoPoint>({ label: '', lat: null, lng: null });
  const [dropoff, setDropoff] = useState<GeoPoint>({ label: '', lat: null, lng: null });
  const [notes, setNotes] = useState('');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [partners, setPartners] = useState<AvDrivePartnerPublic[]>([]);
  const [preferredProfileId, setPreferredProfileId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchAvDrivePartners({
          city: jobType === 'airport_transfer' ? city : undefined,
          jobType,
        });
        setPartners(list);
      } catch {
        setPartners([]);
      }
    })();
  }, [city, jobType]);

  const submit = async () => {
    if (!pickup.label.trim() || !dropoff.label.trim()) {
      Alert.alert('Add pickup and drop-off');
      return;
    }
    // Default schedule: +2 hours if user left blank
    let scheduledAt: string;
    if (scheduledLocal.trim()) {
      const d = new Date(scheduledLocal);
      if (Number.isNaN(d.getTime())) {
        Alert.alert('Schedule', 'Use a valid date/time (e.g. 2026-09-02T14:00:00)');
        return;
      }
      scheduledAt = d.toISOString();
    } else {
      scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    }

    setSubmitting(true);
    try {
      const job = await createAvDriveJob({
        jobType,
        city: jobType === 'airport_transfer' ? city : null,
        corridor: jobType === 'intercity' ? 'Abuja-Kaduna' : `${city}-local`,
        pickupLabel: pickup.label.trim(),
        dropoffLabel: dropoff.label.trim(),
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        scheduledAt,
        notes: notes || null,
        preferredProfileId,
      });
      onBooked(job.id);
    } catch (err: any) {
      Alert.alert('Booking failed', err.message || 'Try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>BOOK</Text>
      <Text style={styles.title}>Request a private car</Text>
      <Text style={styles.subtitle}>Work-ready partners only. Structured jobs — not street pickup.</Text>

      <Text style={styles.label}>Job type</Text>
      <View style={styles.row}>
        <Chip
          label="Airport / hotel"
          active={jobType === 'airport_transfer'}
          onPress={() => setJobType('airport_transfer')}
        />
        <Chip
          label="Abuja ↔ Kaduna"
          active={jobType === 'intercity'}
          onPress={() => setJobType('intercity')}
        />
      </View>

      {jobType === 'airport_transfer' && (
        <>
          <Text style={styles.label}>City</Text>
          <View style={styles.row}>
            <Chip label="Abuja" active={city === 'Abuja'} onPress={() => setCity('Abuja')} />
            <Chip label="Kaduna" active={city === 'Kaduna'} onPress={() => setCity('Kaduna')} />
          </View>
        </>
      )}

      <AvDriveMapPicker
        pickup={pickup}
        dropoff={dropoff}
        onChangePickup={setPickup}
        onChangeDropoff={setDropoff}
        initialRegion={
          city === 'Kaduna'
            ? { latitude: 10.51, longitude: 7.416, latitudeDelta: 0.25, longitudeDelta: 0.25 }
            : undefined
        }
      />

      <Text style={styles.label}>When (ISO local optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="2026-09-02T14:00:00 (or leave blank = +2h)"
        placeholderTextColor={colors.textSecondary}
        value={scheduledLocal}
        onChangeText={setScheduledLocal}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { minHeight: 72 }]}
        placeholder="Flight number, gate, luggage…"
        placeholderTextColor={colors.textSecondary}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Text style={styles.label}>Preferred partner (optional)</Text>
      {partners.length === 0 ? (
        <Text style={styles.hint}>No available partners right now — still submit; owners can accept open jobs.</Text>
      ) : (
        partners.map((p) => (
          <Pressable
            key={p.profileId}
            style={[styles.partner, preferredProfileId === p.profileId && styles.partnerActive]}
            onPress={() =>
              setPreferredProfileId((id) => (id === p.profileId ? null : p.profileId))
            }
          >
            <Text style={styles.partnerName}>{p.displayName}</Text>
            <Text style={styles.partnerMeta}>
              {p.homeCity} · ★ {p.ratingAvg.toFixed(1)} · {p.vehicleLabel || 'Vehicle'}
            </Text>
          </Pressable>
        ))
      )}

      <Pressable style={styles.submit} onPress={submit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.submitText}>Request job</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  kicker: { ...typography.label, color: colors.gold },
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  hint: { ...typography.caption, color: colors.textSecondary },
  partner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  partnerActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.08)' },
  partnerName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  partnerMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  submit: {
    marginTop: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
