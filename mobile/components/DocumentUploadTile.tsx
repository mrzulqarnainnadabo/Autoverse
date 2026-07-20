import React, { useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography } from '../constants/theme';
import { LocalDocument } from '../types/verification.types';

interface Props {
  label: string;
  hint: string;
  document: LocalDocument | null;
  onChange: (doc: LocalDocument | null) => void;
}

export default function DocumentUploadTile({ label, hint, document, onChange }: Props) {
  const handlePick = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to upload documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets?.[0]) return;

    onChange({
      uri: result.assets[0].uri,
      mimeType: 'image/jpeg',
      name: `${label.toLowerCase().replace(/\s+/g, '-')}.jpg`,
    });
  }, [label, onChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>

      <Pressable style={styles.tile} onPress={handlePick}>
        {document ? (
          <>
            <Image source={{ uri: document.uri }} style={styles.preview} />
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>Tap to replace</Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>+</Text>
            <Text style={styles.emptyText}>Take a photo</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 2 },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  tile: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,10,0.75)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  overlayText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { color: colors.gold, fontSize: 28, fontWeight: '300' },
  emptyText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
