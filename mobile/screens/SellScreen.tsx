/**
 * AUTOVERSE — Sell Screen
 *
 * Orchestrates the listing creation wizard: Photos → AI AutoInspect →
 * Details → Publish. A draft vehicle record is created the moment the
 * seller starts (see createListingDraft), so progress is never lost —
 * closing the app mid-flow leaves a resumable draft server-side.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Text, Pressable, Alert } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import StepProgressBar from '../components/StepProgressBar';
import PhotosStep from './sell/PhotosStep';
import InspectStep from './sell/InspectStep';
import DetailsStep from './sell/DetailsStep';
import PublishStep from './sell/PublishStep';
import { createListingDraft } from '../services/listingApi';
import { LocalListingPhoto, ListingDetailsFormState, ListingDraft } from '../types/listing.types';
import { AutoInspectReport } from '../types/autoinspect.types';

const STEPS = ['Photos', 'AI AutoInspect', 'Details', 'Publish'];

const EMPTY_DETAILS: ListingDetailsFormState = {
  make: '',
  model: '',
  year: '',
  mileageKm: '',
  priceNGN: '',
  description: '',
  transmission: null,
  fuelType: null,
  state: '',
  lga: '',
};

interface Props {
  onPublished: (listing: ListingDraft) => void;
  onCancel?: () => void;
}

export default function SellScreen({ onPublished, onCancel }: Props) {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [photos, setPhotos] = useState<LocalListingPhoto[]>([]);
  const [report, setReport] = useState<AutoInspectReport | null>(null);
  const [detailsForm, setDetailsForm] = useState<ListingDetailsFormState>(EMPTY_DETAILS);

  const initDraft = useCallback(async () => {
    setInitializing(true);
    setInitError(null);
    try {
      const { vehicleId } = await createListingDraft();
      setVehicleId(vehicleId);
    } catch (err: any) {
      setInitError(err.message || 'Could not start a new listing. Please try again.');
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    initDraft();
  }, [initDraft]);

  const goNext = useCallback(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), []);
  const goBack = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Discard this listing?',
      'Your draft will be saved and you can resume it later from your dashboard.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: onCancel },
      ]
    );
  }, [onCancel]);

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  if (initError || !vehicleId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{initError}</Text>
        <Pressable style={styles.retryButton} onPress={initDraft}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={stepIndex === 0 ? handleCancel : goBack} hitSlop={12}>
          <Text style={styles.topBarAction}>{stepIndex === 0 ? 'Cancel' : '← Back'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <StepProgressBar steps={STEPS} currentIndex={stepIndex} />

        {stepIndex === 0 && (
          <PhotosStep photos={photos} onChange={setPhotos} onNext={goNext} />
        )}

        {stepIndex === 1 && (
          <InspectStep
            vehicleId={vehicleId}
            photos={photos}
            onComplete={setReport}
            onNext={goNext}
          />
        )}

        {stepIndex === 2 && (
          <DetailsStep
            vehicleId={vehicleId}
            initial={detailsForm}
            onSaved={setDetailsForm}
            onNext={goNext}
          />
        )}

        {stepIndex === 3 && (
          <PublishStep
            vehicleId={vehicleId}
            photos={photos}
            form={detailsForm}
            report={report}
            onPublished={onPublished}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { ...typography.body, color: colors.critical, textAlign: 'center', marginBottom: spacing.md },
  retryButton: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryButtonText: { color: colors.background, fontWeight: '700' },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarAction: { ...typography.body, color: colors.gold, fontWeight: '600' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
});
