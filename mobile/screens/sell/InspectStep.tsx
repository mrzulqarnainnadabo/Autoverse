import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, gradeColor, severityColor } from '../../constants/theme';
import { LocalListingPhoto } from '../../types/listing.types';
import { AutoInspectReport } from '../../types/autoinspect.types';
import { submitPhotosAndInspect } from '../../services/listingApi';

interface Props {
  vehicleId: string;
  photos: LocalListingPhoto[];
  onComplete: (report: AutoInspectReport | null) => void;
  onNext: () => void;
}

type Phase = 'running' | 'done' | 'error';

export default function InspectStep({ vehicleId, photos, onComplete, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>('running');
  const [report, setReport] = useState<AutoInspectReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = useCallback(async () => {
    setPhase('running');
    setErrorMessage(null);
    try {
      const result = await submitPhotosAndInspect({
        vehicleId,
        photos,
        triggerInspection: true,
      });
      setReport(result.report);
      onComplete(result.report);
      setPhase('done');
    } catch (err: any) {
      setErrorMessage(err.message || 'AutoInspect failed. You can retry or skip for now.');
      setPhase('error');
    }
  }, [vehicleId, photos, onComplete]);

  useEffect(() => {
    run();
  }, [run]);

  if (phase === 'running') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.runningTitle}>Running AI AutoInspect…</Text>
        <Text style={styles.runningSubtitle}>
          Claude is analyzing your {photos.length} photos for condition, wear, and trust
          signals. This usually takes 15–30 seconds.
        </Text>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>AutoInspect couldn't complete</Text>
        <Text style={styles.errorSubtitle}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={run}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={() => onNext()}>
          <Text style={styles.skipButtonText}>Skip AutoInspect and continue</Text>
        </Pressable>
      </View>
    );
  }

  // phase === 'done'
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AutoInspect complete</Text>

      {report ? (
        <View style={styles.resultCard}>
          <View style={styles.scoreRow}>
            <View style={[styles.gradeBadge, { borderColor: gradeColor[report.grade] }]}>
              <Text style={[styles.gradeText, { color: gradeColor[report.grade] }]}>{report.grade}</Text>
            </View>
            <View>
              <Text style={styles.scoreValue}>{report.overallScore}/100</Text>
              <Text style={styles.scoreLabel}>Trust Score · this will show on your listing</Text>
            </View>
          </View>

          {report.flags.filter((f) => f.severity === 'critical' || f.severity === 'caution').length > 0 && (
            <View style={styles.flagsBlock}>
              <Text style={styles.flagsLabel}>Worth reviewing before you list:</Text>
              {report.flags
                .filter((f) => f.severity === 'critical' || f.severity === 'caution')
                .map((flag, i) => (
                  <View key={i} style={styles.flagRow}>
                    <View style={[styles.flagDot, { backgroundColor: severityColor[flag.severity] }]} />
                    <Text style={styles.flagText}>{flag.title}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.subtitle}>No AutoInspect report was generated — you can still continue.</Text>
      )}

      <Pressable style={styles.nextButton} onPress={onNext}>
        <Text style={styles.nextButtonText}>Continue to vehicle details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary },
  runningTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.lg },
  runningSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  errorTitle: { ...typography.h2, color: colors.critical },
  errorSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  retryButton: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.lg },
  retryButtonText: { color: colors.background, fontWeight: '700' },
  skipButton: { marginTop: spacing.md },
  skipButtonText: { color: colors.textSecondary, textDecorationLine: 'underline' },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  gradeBadge: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  gradeText: { fontSize: 24, fontWeight: '800' },
  scoreValue: { ...typography.h2, color: colors.textPrimary },
  scoreLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  flagsBlock: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  flagsLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.sm },
  flagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  flagDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  flagText: { ...typography.body, color: colors.textPrimary },
  nextButton: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  nextButtonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
