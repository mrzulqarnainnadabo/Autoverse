import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export default function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  chipActive: { borderColor: colors.gold, backgroundColor: 'rgba(212,175,55,0.12)' },
  text: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  textActive: { color: colors.gold },
});
