/**
 * AUTOVERSE — AI AutoInspect Capture Screen
 *
 * Guides a seller through a fixed sequence of vehicle photos so the
 * Claude vision backend always receives consistent, labeled angles.
 * Built for Nigerian mobile-data realities: images are compressed
 * client-side before upload (quality 0.6, resized) to keep payloads
 * small on 3G/4G connections.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, typography } from '../constants/theme';
import { CapturedPhoto, InspectionAngle, AutoInspectReport } from '../types/autoinspect.types';
import { submitAutoInspect } from '../services/autoInspectApi';

interface AngleStep {
  angle: InspectionAngle;
  label: string;
  hint: string;
  required: boolean;
}

const CAPTURE_SEQUENCE: AngleStep[] = [
  { angle: 'front_34', label: 'Front (3/4 angle)', hint: 'Stand at the front corner, capture the whole front + one side', required: true },
  { angle: 'rear_34', label: 'Rear (3/4 angle)', hint: 'Same as above, from the rear corner', required: true },
  { angle: 'left_side', label: 'Left side', hint: 'Full profile, straight-on', required: true },
  { angle: 'right_side', label: 'Right side', hint: 'Full profile, straight-on', required: true },
  { angle: 'dashboard', label: 'Dashboard', hint: 'Full dashboard, engine off, ignition on if possible', required: true },
  { angle: 'odometer', label: 'Odometer reading', hint: 'Close-up, digits must be legible', required: true },
  { angle: 'tires_front', label: 'Front tires', hint: 'Both front tires, tread visible', required: true },
  { angle: 'tires_rear', label: 'Rear tires', hint: 'Both rear tires, tread visible', required: true },
  { angle: 'interior_seats', label: 'Interior / seats', hint: 'Front seats, check for stains or wear', required: true },
  { angle: 'vin_plate', label: 'VIN plate', hint: 'Usually on door jamb or dashboard edge', required: false },
  { angle: 'engine_bay', label: 'Engine bay', hint: 'Hood open, wide shot of the engine', required: false },
];

interface Props {
  vehicleId: string;
  sellerId: string;
  declaredYear?: number;
  declaredMake?: string;
  declaredModel?: string;
  declaredMileageKm?: number;
  onComplete: (report: AutoInspectReport) => void;
}

export default function AutoInspectCaptureScreen({
  vehicleId,
  sellerId,
  declaredYear,
  declaredMake,
  declaredModel,
  declaredMileageKm,
  onComplete,
}: Props) {
  const [photos, setPhotos] = useState<Record<InspectionAngle, CapturedPhoto | undefined>>({} as any);
  const [submitting, setSubmitting] = useState(false);

  const requiredComplete = useMemo(
    () => CAPTURE_SEQUENCE.filter((s) => s.required).every((s) => !!photos[s.angle]),
    [photos]
  );

  const capturedCount = Object.keys(photos).length;

  const captureAngle = useCallback(async (angle: InspectionAngle) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to complete AutoInspect.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    // Compress client-side: resize to max 1280px wide, JPEG q=0.6.
    // Keeps a 9-photo submission well under ~3MB total on 3G.
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    setPhotos((prev) => ({ ...prev, [angle]: { angle, uri: manipulated.uri } }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!requiredComplete) {
      Alert.alert('Missing photos', 'Please capture all required angles before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const photoList = Object.values(photos).filter(Boolean) as CapturedPhoto[];
      const report = await submitAutoInspect({
        vehicleId,
        sellerId,
        declaredYear,
        declaredMake,
        declaredModel,
        declaredMileageKm,
        photos: photoList,
      });
      onComplete(report);
    } catch (err) {
      Alert.alert(
        'AutoInspect failed',
        'We could not complete the inspection. Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }, [photos, requiredComplete, vehicleId, sellerId, declaredYear, declaredMake, declaredModel, declaredMileageKm, onComplete]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI AutoInspect</Text>
        <Text style={styles.subtitle}>
          {capturedCount} of {CAPTURE_SEQUENCE.length} photos captured
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(capturedCount / CAPTURE_SEQUENCE.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {CAPTURE_SEQUENCE.map((step) => {
          const captured = photos[step.angle];
          return (
            <Pressable
              key={step.angle}
              style={styles.row}
              onPress={() => captureAngle(step.angle)}
            >
              <View style={styles.thumbWrap}>
                {captured ? (
                  <Image source={{ uri: captured.uri }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbPlaceholderText}>+</Text>
                  </View>
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>
                  {step.label} {step.required && <Text style={styles.required}>*</Text>}
                </Text>
                <Text style={styles.rowHint}>{step.hint}</Text>
              </View>
              {captured && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, !requiredComplete && styles.submitButtonDisabled]}
          disabled={!requiredComplete || submitting}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>Run AI AutoInspect</Text>
          )}
        </Pressable>
        <Text style={styles.footerNote}>
          Analysis typically takes 15–30 seconds. Your data is processed securely and never shared without consent.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.gold },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.gold },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbWrap: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', marginRight: spacing.md },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: { color: colors.gold, fontSize: 22 },
  rowText: { flex: 1 },
  rowLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  required: { color: colors.gold },
  rowHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  checkmark: { color: colors.success, fontSize: 18, fontWeight: '700', marginLeft: spacing.sm },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: colors.goldMuted, opacity: 0.5 },
  submitButtonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
  footerNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});
