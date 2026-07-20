/**
 * AUTOVERSE — Dealer Verification Screen
 *
 * Shows the dealer's current KYC status and, when nothing is approved
 * yet, the submission form. This is the only path by which the
 * "Verified Dealer" badge shown everywhere else in the app (search,
 * detail, dashboard) ever becomes true.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import Chip from '../components/Chip';
import DocumentUploadTile from '../components/DocumentUploadTile';
import { fetchMyVerification, submitVerification } from '../services/verificationApi';
import { VerificationSubmissionWithViewUrls, LocalDocument, IdDocumentType } from '../types/verification.types';

interface Props {
  dealerId: string;
}

const ID_DOCUMENT_OPTIONS: Array<{ value: IdDocumentType; label: string }> = [
  { value: 'nin', label: 'NIN Slip' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'international_passport', label: 'International Passport' },
  { value: 'voters_card', label: "Voter's Card" },
];

const STATUS_COPY: Record<string, { title: string; color: string; body: string }> = {
  pending: {
    title: 'Verification Pending',
    color: colors.warning,
    body: 'Your documents are with our review team. This usually takes 1–2 business days.',
  },
  approved: {
    title: 'Verified Dealer',
    color: colors.success,
    body: 'Your business is verified. The Verified badge is now live on all your listings.',
  },
  rejected: {
    title: 'Verification Needs Attention',
    color: colors.critical,
    body: 'Your last submission was not approved. Review the note below and resubmit.',
  },
};

export default function DealerVerificationScreen({ dealerId }: Props) {
  const [submission, setSubmission] = useState<VerificationSubmissionWithViewUrls | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [cacDocument, setCacDocument] = useState<LocalDocument | null>(null);
  const [idDocument, setIdDocument] = useState<LocalDocument | null>(null);
  const [idDocumentType, setIdDocumentType] = useState<IdDocumentType>('nin');
  const [businessAddress, setBusinessAddress] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchMyVerification(dealerId);
      setSubmission(result);
    } catch {
      // Non-fatal — dealer just sees the submission form
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    load();
  }, [load]);

  const isValid = cacDocument && idDocument && businessAddress.trim().length >= 5;

  const handleSubmit = useCallback(async () => {
    if (!cacDocument || !idDocument) return;
    setSubmitting(true);
    try {
      await submitVerification(dealerId, {
        cacDocument,
        idDocument,
        idDocumentType,
        businessAddress: businessAddress.trim(),
      });
      await load();
    } catch (err: any) {
      Alert.alert('Submission failed', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [dealerId, cacDocument, idDocument, idDocumentType, businessAddress, load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const showForm = !submission || submission.status === 'rejected';
  const statusInfo = submission ? STATUS_COPY[submission.status] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dealer Verification</Text>
      <Text style={styles.subtitle}>
        Verified dealers get a trust badge across search, listings, and their dashboard —
        buyers message and call verified sellers first.
      </Text>

      {statusInfo && (
        <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
          <Text style={[styles.statusTitle, { color: statusInfo.color }]}>{statusInfo.title}</Text>
          <Text style={styles.statusBody}>{statusInfo.body}</Text>
          {submission?.status === 'rejected' && submission.reviewerNotes && (
            <View style={styles.reviewerNoteBox}>
              <Text style={styles.reviewerNoteLabel}>Reviewer note</Text>
              <Text style={styles.reviewerNoteText}>{submission.reviewerNotes}</Text>
            </View>
          )}
        </View>
      )}

      {showForm && (
        <View style={styles.form}>
          <DocumentUploadTile
            label="CAC Certificate"
            hint="Business registration certificate from the Corporate Affairs Commission"
            document={cacDocument}
            onChange={setCacDocument}
          />

          <Text style={styles.fieldLabel}>ID Document Type</Text>
          <View style={styles.chipRow}>
            {ID_DOCUMENT_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={idDocumentType === opt.value}
                onPress={() => setIdDocumentType(opt.value)}
              />
            ))}
          </View>

          <DocumentUploadTile
            label="Government-Issued ID"
            hint="Must clearly show your name and photo"
            document={idDocument}
            onChange={setIdDocument}
          />

          <Text style={styles.fieldLabel}>Business Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="Full registered business address"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            disabled={!isValid || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>
                {submission?.status === 'rejected' ? 'Resubmit for Review' : 'Submit for Verification'}
              </Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            Documents are stored privately and only accessible to the AUTOVERSE review team.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusTitle: { ...typography.h2, fontSize: 17 },
  statusBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  reviewerNoteBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewerNoteLabel: { ...typography.label, color: colors.critical, marginBottom: spacing.xs },
  reviewerNoteText: { ...typography.body, color: colors.textPrimary },
  form: {},
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
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
  textArea: { height: 80, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: { backgroundColor: colors.goldMuted, opacity: 0.5 },
  submitButtonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
  disclaimer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
