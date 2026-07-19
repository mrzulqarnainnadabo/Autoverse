import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { NIGERIAN_STATES } from '../../constants/nigeria';
import { ListingDetailsFormState, Transmission, FuelType } from '../../types/listing.types';
import { updateListingDetails } from '../../services/listingApi';

interface Props {
  vehicleId: string;
  initial: ListingDetailsFormState;
  onSaved: (form: ListingDetailsFormState) => void;
  onNext: () => void;
}

function formatPriceInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-NG');
}

export default function DetailsStep({ vehicleId, initial, onSaved, onNext }: Props) {
  const [form, setForm] = useState<ListingDetailsFormState>(initial);
  const [saving, setSaving] = useState(false);

  const update = useCallback(<K extends keyof ListingDetailsFormState>(key: K, value: ListingDetailsFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isValid =
    form.make.trim().length > 0 &&
    form.model.trim().length > 0 &&
    form.year.length === 4 &&
    form.mileageKm.length > 0 &&
    form.priceNGN.length > 0 &&
    form.state.length > 0;

  const handleContinue = useCallback(async () => {
    if (!isValid) {
      Alert.alert('Missing details', 'Please fill in make, model, year, mileage, price, and state.');
      return;
    }
    setSaving(true);
    try {
      await updateListingDetails(vehicleId, form);
      onSaved(form);
      onNext();
    } catch (err: any) {
      Alert.alert('Could not save details', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [vehicleId, form, isValid, onSaved, onNext]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Vehicle details</Text>

      <Field label="Make *">
        <TextInput
          style={styles.input}
          value={form.make}
          onChangeText={(v) => update('make', v)}
          placeholder="e.g. Toyota"
          placeholderTextColor={colors.textSecondary}
        />
      </Field>

      <Field label="Model *">
        <TextInput
          style={styles.input}
          value={form.model}
          onChangeText={(v) => update('model', v)}
          placeholder="e.g. Camry"
          placeholderTextColor={colors.textSecondary}
        />
      </Field>

      <View style={styles.row}>
        <Field label="Year *" flex={1}>
          <TextInput
            style={styles.input}
            value={form.year}
            onChangeText={(v) => update('year', v.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="2019"
            keyboardType="number-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </Field>
        <View style={{ width: spacing.md }} />
        <Field label="Mileage (km) *" flex={1}>
          <TextInput
            style={styles.input}
            value={form.mileageKm}
            onChangeText={(v) => update('mileageKm', v.replace(/[^0-9]/g, ''))}
            placeholder="45000"
            keyboardType="number-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </Field>
      </View>

      <Field label="Price (₦) *">
        <TextInput
          style={styles.input}
          value={form.priceNGN}
          onChangeText={(v) => update('priceNGN', formatPriceInput(v))}
          placeholder="8,500,000"
          keyboardType="number-pad"
          placeholderTextColor={colors.textSecondary}
        />
      </Field>

      <Field label="Transmission">
        <View style={styles.segmentRow}>
          {(['automatic', 'manual'] as Transmission[]).map((t) => (
            <Pressable
              key={t}
              style={[styles.segment, form.transmission === t && styles.segmentActive]}
              onPress={() => update('transmission', t)}
            >
              <Text style={[styles.segmentText, form.transmission === t && styles.segmentTextActive]}>
                {t === 'automatic' ? 'Automatic' : 'Manual'}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Fuel type">
        <View style={styles.segmentRow}>
          {(['petrol', 'diesel', 'hybrid', 'electric'] as FuelType[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.segment, form.fuelType === f && styles.segmentActive]}
              onPress={() => update('fuelType', f)}
            >
              <Text style={[styles.segmentText, form.fuelType === f && styles.segmentTextActive]}>
                {f[0].toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="State *">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {NIGERIAN_STATES.map((state) => (
            <Pressable
              key={state}
              style={[styles.chip, form.state === state && styles.chipActive]}
              onPress={() => update('state', state)}
            >
              <Text style={[styles.chipText, form.state === state && styles.chipTextActive]}>{state}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Field>

      <Field label="Local Government Area">
        <TextInput
          style={styles.input}
          value={form.lga}
          onChangeText={(v) => update('lga', v)}
          placeholder="e.g. Ikeja"
          placeholderTextColor={colors.textSecondary}
        />
      </Field>

      <Field label="Description">
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Tell buyers about the vehicle's history, features, and condition..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />
      </Field>

      <Pressable
        style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
        disabled={!isValid || saving}
        onPress={handleContinue}
      >
        {saving ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.nextButtonText}>Continue to review</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <View style={[styles.field, flex ? { flex } : undefined]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.lg },
  row: { flexDirection: 'row' },
  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segment: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  segmentActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  segmentText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: colors.gold },
  chipScroll: { flexDirection: 'row' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: colors.gold },
  nextButton: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  nextButtonDisabled: { backgroundColor: colors.goldMuted, opacity: 0.5 },
  nextButtonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
