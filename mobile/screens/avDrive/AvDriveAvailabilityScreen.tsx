/** Owner: city, job types, go available. */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import Chip from '../../components/Chip';
import {
  fetchMyAvDriveProfile,
  setAvDriveAvailability,
  upsertAvDriveProfile,
} from '../../services/avDriveApi';
import { AvDriveCity, AvDriveJobType, AvDriveProfile } from '../../types/avDrive.types';

interface Props {
  onDone?: () => void;
}

export default function AvDriveAvailabilityScreen({ onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AvDriveProfile | null>(null);
  const [homeCity, setHomeCity] = useState<AvDriveCity>('Abuja');
  const [jobTypes, setJobTypes] = useState<AvDriveJobType[]>(['airport_transfer']);
  const [bio, setBio] = useState('');
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchMyAvDriveProfile();
        if (p) {
          setProfile(p);
          setHomeCity(p.homeCity);
          setJobTypes(p.jobTypes.length ? p.jobTypes : ['airport_transfer']);
          setBio(p.bio || '');
          setAvailable(p.isAvailable);
        }
      } catch (err: any) {
        Alert.alert('AV Drive', err.message || 'Could not load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleType = (t: AvDriveJobType) => {
    setJobTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const save = async () => {
    if (!jobTypes.length) {
      Alert.alert('Select at least one job type');
      return;
    }
    setSaving(true);
    try {
      const p = await upsertAvDriveProfile({
        homeCity,
        jobTypes,
        bio: bio || null,
      });
      setProfile(p);
      const p2 = await setAvDriveAvailability({ isAvailable: available });
      setProfile(p2);
      Alert.alert('Saved', available ? 'You are available for jobs.' : 'You are offline.');
      onDone?.();
    } catch (err: any) {
      Alert.alert('Could not save', err.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>EARN</Text>
      <Text style={styles.title}>Partner setup</Text>
      <Text style={styles.subtitle}>
        Pilot cities only. Work-ready requires KYC + vehicle (admin can flip work_ready).
      </Text>

      <Text style={styles.label}>Home city</Text>
      <View style={styles.row}>
        <Chip label="Abuja" active={homeCity === 'Abuja'} onPress={() => setHomeCity('Abuja')} />
        <Chip label="Kaduna" active={homeCity === 'Kaduna'} onPress={() => setHomeCity('Kaduna')} />
      </View>

      <Text style={styles.label}>Job types</Text>
      <View style={styles.row}>
        <Chip
          label="Airport / hotel"
          active={jobTypes.includes('airport_transfer')}
          onPress={() => toggleType('airport_transfer')}
        />
        <Chip
          label="Abuja ↔ Kaduna"
          active={jobTypes.includes('intercity')}
          onPress={() => toggleType('intercity')}
        />
      </View>

      <Text style={styles.label}>Short bio (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Clean Camry, AAIA runs, punctual"
        placeholderTextColor={colors.textSecondary}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Available for jobs</Text>
          <Text style={styles.switchHint}>
            {profile?.workReady
              ? 'Clients can request you when on.'
              : 'Save profile first; Work-ready must be true before going live.'}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={setAvailable}
          trackColor={{ false: colors.border, true: colors.goldMuted }}
          thumbColor={available ? colors.gold : colors.silver}
        />
      </View>

      <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.saveText}>Save</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...typography.label, color: colors.gold },
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  switchHint: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
