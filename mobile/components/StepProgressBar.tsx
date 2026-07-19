import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface Props {
  steps: string[];
  currentIndex: number;
}

export default function StepProgressBar({ steps, currentIndex }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.trackRow}>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <View
              style={[
                styles.dot,
                i < currentIndex && styles.dotDone,
                i === currentIndex && styles.dotActive,
              ]}
            >
              {i < currentIndex ? (
                <Text style={styles.dotDoneText}>✓</Text>
              ) : (
                <Text style={[styles.dotText, i === currentIndex && styles.dotTextActive]}>
                  {i + 1}
                </Text>
              )}
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.line, i < currentIndex && styles.lineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.label}>
        Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]}
      </Text>
    </View>
  );
}

const DOT_SIZE = 28;

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { borderColor: colors.gold },
  dotDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  dotTextActive: { color: colors.gold },
  dotDoneText: { color: colors.background, fontWeight: '800', fontSize: 13 },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  lineDone: { backgroundColor: colors.gold },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
});
