/**
 * AUTOVERSE — PhotoUploadGrid
 *
 * A reusable grid photo picker used by the Sell flow (and reusable
 * anywhere else a vehicle needs guided photo capture). Renders a tile
 * per required angle first — captured photos double as both the
 * listing gallery AND the AutoInspect input set, so sellers only shoot
 * once. Additional free-form photos can be added up to `maxTotal`.
 */

import React, { useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, typography } from '../constants/theme';
import { InspectionAngle } from '../types/autoinspect.types';
import { LocalListingPhoto } from '../types/listing.types';

export interface RequiredAngleSpec {
  angle: InspectionAngle;
  label: string;
}

interface Props {
  requiredAngles: RequiredAngleSpec[];
  photos: LocalListingPhoto[];
  onChange: (photos: LocalListingPhoto[]) => void;
  maxTotal?: number;
}

const GUTTER = spacing.sm;

async function captureCompressedPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera access needed', 'Enable camera access in Settings to add photos.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipulated.uri;
}

export default function PhotoUploadGrid({ requiredAngles, photos, onChange, maxTotal = 12 }: Props) {
  const { width } = useWindowDimensions();
  const columns = width >= 768 ? 4 : 3;
  const tileSize = (width - spacing.lg * 2 - GUTTER * (columns - 1)) / columns;

  const photoForAngle = useCallback(
    (angle: InspectionAngle) => photos.find((p) => p.angle === angle),
    [photos]
  );
  const extraPhotos = photos.filter((p) => p.angle === null);

  const handleCaptureAngle = useCallback(
    async (angle: InspectionAngle) => {
      const uri = await captureCompressedPhoto();
      if (!uri) return;
      const withoutAngle = photos.filter((p) => p.angle !== angle);
      onChange([...withoutAngle, { angle, uri }]);
    },
    [photos, onChange]
  );

  const handleAddExtra = useCallback(async () => {
    if (photos.length >= maxTotal) {
      Alert.alert('Photo limit reached', `You can add up to ${maxTotal} photos.`);
      return;
    }
    const uri = await captureCompressedPhoto();
    if (!uri) return;
    onChange([...photos, { angle: null, uri }]);
  }, [photos, onChange, maxTotal]);

  const handleRemove = useCallback(
    (target: LocalListingPhoto) => {
      onChange(photos.filter((p) => p !== target));
    },
    [photos, onChange]
  );

  return (
    <View>
      <Text style={styles.sectionLabel}>Required angles</Text>
      <View style={[styles.grid, { gap: GUTTER }]}>
        {requiredAngles.map((spec) => {
          const captured = photoForAngle(spec.angle);
          return (
            <Pressable
              key={spec.angle}
              style={[styles.tile, { width: tileSize, height: tileSize }]}
              onPress={() => handleCaptureAngle(spec.angle)}
            >
              {captured ? (
                <>
                  <Image source={{ uri: captured.uri }} style={styles.tileImage} />
                  <Pressable
                    style={styles.removeBadge}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemove(captured);
                    }}
                  >
                    <Text style={styles.removeBadgeText}>✕</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.tileEmpty}>
                  <Text style={styles.tilePlus}>+</Text>
                </View>
              )}
              <Text style={styles.tileLabel} numberOfLines={1}>{spec.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
        Extra photos ({extraPhotos.length}/{maxTotal - requiredAngles.length})
      </Text>
      <View style={[styles.grid, { gap: GUTTER }]}>
        {extraPhotos.map((photo, i) => (
          <View key={i} style={[styles.tile, { width: tileSize, height: tileSize }]}>
            <Image source={{ uri: photo.uri }} style={styles.tileImage} />
            <Pressable style={styles.removeBadge} onPress={() => handleRemove(photo)}>
              <Text style={styles.removeBadgeText}>✕</Text>
            </Pressable>
          </View>
        ))}
        {photos.length < maxTotal && (
          <Pressable style={[styles.tile, { width: tileSize, height: tileSize }]} onPress={handleAddExtra}>
            <View style={styles.tileEmpty}>
              <Text style={styles.tilePlus}>+</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderRadius: 10, overflow: 'hidden' },
  tileImage: { width: '100%', height: '100%' },
  tileEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlus: { color: colors.gold, fontSize: 22, fontWeight: '300' },
  tileLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,10,0.75)',
    color: colors.textPrimary,
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 2,
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(10,10,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
});
