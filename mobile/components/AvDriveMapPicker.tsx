/**
 * Phase A map: pick pickup / dropoff.
 * Uses react-native-maps when available; falls back to label fields + optional lat/lng.
 * "Open in Google Maps" always works via Linking.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

// Optional native map — may be undefined until `npx expo install react-native-maps`
let MapView: any = null;
let Marker: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
} catch {
  MapView = null;
}

export interface GeoPoint {
  label: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  pickup: GeoPoint;
  dropoff: GeoPoint;
  onChangePickup: (p: GeoPoint) => void;
  onChangeDropoff: (p: GeoPoint) => void;
  /** Default map region — Abuja center */
  initialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

const ABUJA_REGION = {
  latitude: 9.0765,
  longitude: 7.3986,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

export function openInGoogleMaps(lat: number, lng: number, label?: string) {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${q}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url).catch(() => undefined);
}

export default function AvDriveMapPicker({
  pickup,
  dropoff,
  onChangePickup,
  onChangeDropoff,
  initialRegion = ABUJA_REGION,
}: Props) {
  const [activePin, setActivePin] = useState<'pickup' | 'dropoff'>('pickup');

  const onMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (activePin === 'pickup') {
      onChangePickup({ ...pickup, lat: latitude, lng: longitude });
    } else {
      onChangeDropoff({ ...dropoff, lat: latitude, lng: longitude });
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Route</Text>

      <Text style={styles.fieldLabel}>Pickup</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Nnamdi Azikiwe Airport, Abuja"
        placeholderTextColor={colors.textSecondary}
        value={pickup.label}
        onChangeText={(t) => onChangePickup({ ...pickup, label: t })}
      />

      <Text style={styles.fieldLabel}>Drop-off</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Transcorp Hilton / Kaduna city"
        placeholderTextColor={colors.textSecondary}
        value={dropoff.label}
        onChangeText={(t) => onChangeDropoff({ ...dropoff, label: t })}
      />

      {MapView ? (
        <>
          <View style={styles.pinRow}>
            <Pressable
              style={[styles.pinChip, activePin === 'pickup' && styles.pinChipActive]}
              onPress={() => setActivePin('pickup')}
            >
              <Text style={[styles.pinText, activePin === 'pickup' && styles.pinTextActive]}>
                Set pickup pin
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pinChip, activePin === 'dropoff' && styles.pinChipActive]}
              onPress={() => setActivePin('dropoff')}
            >
              <Text style={[styles.pinText, activePin === 'dropoff' && styles.pinTextActive]}>
                Set drop-off pin
              </Text>
            </Pressable>
          </View>
          <MapView style={styles.map} initialRegion={initialRegion} onPress={onMapPress}>
            {pickup.lat != null && pickup.lng != null && Marker && (
              <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" pinColor="#D4AF37" />
            )}
            {dropoff.lat != null && dropoff.lng != null && Marker && (
              <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} title="Drop-off" pinColor="#3FA76A" />
            )}
          </MapView>
          <Text style={styles.hint}>Tap the map to place the active pin.</Text>
        </>
      ) : (
        <Text style={styles.hint}>
          Map module not installed yet. Labels are enough for MVP — install react-native-maps for pins.
          Coordinates can still be set later.
        </Text>
      )}

      <View style={styles.linkRow}>
        {pickup.lat != null && pickup.lng != null && (
          <Pressable onPress={() => openInGoogleMaps(pickup.lat!, pickup.lng!, pickup.label)}>
            <Text style={styles.link}>Open pickup in Maps</Text>
          </Pressable>
        )}
        {dropoff.lat != null && dropoff.lng != null && (
          <Pressable onPress={() => openInGoogleMaps(dropoff.lat!, dropoff.lng!, dropoff.label)}>
            <Text style={styles.link}>Open drop-off in Maps</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  sectionLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.sm },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    ...typography.body,
  },
  pinRow: { flexDirection: 'row', marginTop: spacing.md, marginBottom: spacing.sm },
  pinChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
  },
  pinChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  pinText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  pinTextActive: { color: colors.gold },
  map: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  link: { ...typography.caption, color: colors.gold, fontWeight: '600' },
});
