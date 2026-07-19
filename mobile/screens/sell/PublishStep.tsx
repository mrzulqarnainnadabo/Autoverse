import React, { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors, spacing, typography, gradeColor } from '../../constants/theme';
import { LocalListingPhoto, ListingDetailsFormState, ListingDraft } from '../../types/listing.types';
import { AutoInspectReport } from '../../types/autoinspect.types';
import { publishListing } from '../../services/listingApi';

interface Props {
  vehicleId: string;
  photos: LocalListingPhoto[];
  form: ListingDetailsFormState;
  report: AutoInspectReport | null;
  onPublished: (listing: ListingDraft) => void;
}

export default function PublishStep({ vehicleId, photos, form, report, onPublished }: Props) {
  const [publishing, setPublishing] = useState(false);
  const coverPhoto = photos.find((p) => p.angle === 'front_34') || photos[0];

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const listing = await publishListing(vehicleId);
      onPublished(listing);
    } catch (err: any) {
      Alert.alert(
        'Could not publish',
        err.message || 'Please check your listing details and try again.'
      );
    } finally {
      setPublishing(false);
    }
  }, [vehicleId, onPublished]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Review & publish</Text>
      <Text style={styles.subtitle}>
        This is how buyers will see your listing. Double-check everything before it goes live.
      </Text>

      <View style={styles.previewCard}>
        <View style={styles.imageWrap}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto.uri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>AV</Text>
            </View>
          )}
          {report && (
            <View style={[styles.gradeBadge, { borderColor: gradeColor[report.grade] }]}>
              <Text style={[styles.gradeBadgeText, { color: gradeColor[report.grade] }]}>{report.grade}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.vehicleTitle}>
            {form.year} {form.make} {form.model}
          </Text>
          <Text style={styles.price}>₦{form.priceNGN}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{Number(form.mileageKm).toLocaleString('en-NG')} km</Text>
            {form.transmission && <Text style={styles.metaText}>· {form.transmission}</Text>}
            {form.fuelType && <Text style={styles.metaText}>· {form.fuelType}</Text>}
          </View>
          <Text style={styles.metaText}>{form.lga ? `${form.lga}, ` : ''}{form.state}</Text>

          {form.description ? (
            <Text style={styles.description} numberOfLines={4}>{form.description}</Text>
          ) : null}

          <Text style={styles.photoCount}>{photos.length} photos attached</Text>
        </View>
      </View>

      {report && (
        <View style={styles.trustNote}>
          <Text style={styles.trustNoteText}>
            ✓ AI AutoInspect Trust Score of {report.overallScore}/100 will display on this listing,
            giving buyers verified confidence before they contact you.
          </Text>
        </View>
      )}

      <Pressable style={styles.publishButton} disabled={publishing} onPress={handlePublish}>
        {publishing ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.publishButtonText}>Publish Listing</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.surfaceElevated },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { color: colors.goldMuted, fontWeight: '800', fontSize: 24, letterSpacing: 2 },
  gradeBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  gradeBadgeText: { fontWeight: '800', fontSize: 16 },
  body: { padding: spacing.lg },
  vehicleTitle: { ...typography.h2, color: colors.textPrimary },
  price: { ...typography.h1, color: colors.gold, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', marginTop: spacing.sm, gap: 6 },
  metaText: { ...typography.caption, color: colors.textSecondary },
  description: { ...typography.body, color: colors.textPrimary, marginTop: spacing.md },
  photoCount: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  trustNote: {
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: colors.goldMuted,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  trustNoteText: { ...typography.caption, color: colors.gold },
  publishButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  publishButtonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
