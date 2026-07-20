import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { fetchSubmissionForReview, reviewSubmission } from '../../services/verificationApi';
import { VerificationSubmissionWithViewUrls } from '../../types/verification.types';

interface Props {
  submissionId: string;
  onDecided: () => void;
}

const DOC_LABELS: Record<string, string> = {
  nin: 'NIN Slip',
  drivers_license: "Driver's License",
  international_passport: 'International Passport',
  voters_card: "Voter's Card",
};

export default function VerificationReviewScreen({ submissionId, onDecided }: Props) {
  const [submission, setSubmission] = useState<VerificationSubmissionWithViewUrls | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubmission(await fetchSubmissionForReview(submissionId));
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecision = useCallback(
    async (decision: 'approved' | 'rejected') => {
      if (decision === 'rejected' && !notes.trim()) {
        Alert.alert('Note required', 'Please explain why this submission is being rejected.');
        return;
      }
      setDeciding(true);
      try {
        await reviewSubmission(submissionId, decision, notes.trim() || undefined);
        onDecided();
      } catch (err: any) {
        Alert.alert('Could not submit decision', err.message || 'Please try again.');
      } finally {
        setDeciding(false);
      }
    },
    [submissionId, notes, onDecided]
  );

  if (loading || !submission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review Submission</Text>
      <Text style={styles.address}>{submission.businessAddress}</Text>

      <View style={styles.docSection}>
        <Text style={styles.docLabel}>CAC Certificate</Text>
        <Image source={{ uri: submission.cacDocumentViewUrl }} style={styles.docImage} resizeMode="contain" />
      </View>

      <View style={styles.docSection}>
        <Text style={styles.docLabel}>{DOC_LABELS[submission.idDocumentType]}</Text>
        <Image source={{ uri: submission.idDocumentViewUrl }} style={styles.docImage} resizeMode="contain" />
      </View>

      <Text style={styles.fieldLabel}>Reviewer Notes</Text>
      <TextInput
        style={styles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="Required if rejecting — optional if approving"
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={3}
      />

      <View style={styles.actionRow}>
        <Pressable
          style={styles.rejectButton}
          disabled={deciding}
          onPress={() => handleDecision('rejected')}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
        <Pressable
          style={styles.approveButton}
          disabled={deciding}
          onPress={() => handleDecision('approved')}
        >
          {deciding ? <ActivityIndicator color={colors.background} /> : <Text style={styles.approveButtonText}>Approve</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary },
  address: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  docSection: { marginBottom: spacing.lg },
  docLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.sm },
  docImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
    height: 80,
    textAlignVertical: 'top',
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.critical,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rejectButtonText: { color: colors.critical, fontWeight: '700' },
  approveButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  approveButtonText: { color: colors.background, fontWeight: '700' },
});
