import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import PhotoUploadGrid, { RequiredAngleSpec } from '../../components/PhotoUploadGrid';
import { LocalListingPhoto } from '../../types/listing.types';

const REQUIRED_ANGLES: RequiredAngleSpec[] = [
  { angle: 'front_34', label: 'Front' },
  { angle: 'rear_34', label: 'Rear' },
  { angle: 'left_side', label: 'Left side' },
  { angle: 'right_side', label: 'Right side' },
  { angle: 'dashboard', label: 'Dashboard' },
  { angle: 'odometer', label: 'Odometer' },
  { angle: 'tires_front', label: 'Front tires' },
  { angle: 'tires_rear', label: 'Rear tires' },
  { angle: 'interior_seats', label: 'Interior' },
];

interface Props {
  photos: LocalListingPhoto[];
  onChange: (photos: LocalListingPhoto[]) => void;
  onNext: () => void;
}

export default function PhotosStep({ photos, onChange, onNext }: Props) {
  const requiredComplete = useMemo(
    () => REQUIRED_ANGLES.every((spec) => photos.some((p) => p.angle === spec.angle)),
    [photos]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add photos</Text>
      <Text style={styles.subtitle}>
        These photos become both your listing gallery and the input for your free AI
        AutoInspect trust report — no need to shoot twice.
      </Text>

      <PhotoUploadGrid requiredAngles={REQUIRED_ANGLES} photos={photos} onChange={onChange} />

      <Pressable
        style={[styles.nextButton, !requiredComplete && styles.nextButtonDisabled]}
        disabled={!requiredComplete}
        onPress={onNext}
      >
        <Text style={styles.nextButtonText}>Continue to AI AutoInspect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  nextButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  nextButtonDisabled: { backgroundColor: colors.goldMuted, opacity: 0.5 },
  nextButtonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
