import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface Props {
  label: string;
  value: string;
  accent?: 'gold' | 'success' | 'warning' | 'default';
  width: number; // computed by parent for responsive grid
}

const accentColor: Record<string, string> = {
  gold: colors.gold,
  success: colors.success,
  warning: colors.warning,
  default: colors.textPrimary,
};

export default function StatCard({ label, value, accent = 'default', width }: Props) {
  return (
    <View style={[styles.card, { width }]}>
      <Text style={[styles.value, { color: accentColor[accent] }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  value: { ...typography.h1, fontSize: 24 },
  label: { ...typography.label, color: colors.textSecondary, marginTop: spacing.xs },
});
