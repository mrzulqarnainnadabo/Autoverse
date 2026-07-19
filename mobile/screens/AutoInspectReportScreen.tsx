/**
 * AUTOVERSE — AutoInspect Report Screen
 * Displays the completed AI condition report to buyers and sellers.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, gradeColor, severityColor } from '../constants/theme';
import { AutoInspectReport } from '../types/autoinspect.types';

interface Props {
  report: AutoInspectReport;
}

function formatNGN(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default function AutoInspectReportScreen({ report }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score hero */}
      <View style={styles.hero}>
        <View style={[styles.gradeBadge, { borderColor: gradeColor[report.grade] }]}>
          <Text style={[styles.gradeText, { color: gradeColor[report.grade] }]}>{report.grade}</Text>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroScore}>{report.overallScore}/100</Text>
          <Text style={styles.heroLabel}>AutoInspect Trust Score</Text>
          <Text style={styles.heroConfidence}>Confidence: {report.confidence.toUpperCase()}</Text>
        </View>
      </View>

      {/* Odometer */}
      {report.odometerReadingKm !== null && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Odometer</Text>
          <Text style={styles.odometerValue}>
            {report.odometerReadingKm.toLocaleString('en-NG')} km
          </Text>
          {report.odometerPlausible === false && (
            <Text style={styles.criticalNote}>
              ⚠ Visual wear appears inconsistent with declared mileage — review flags below.
            </Text>
          )}
        </View>
      )}

      {/* Flags */}
      {report.flags.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Findings</Text>
          {report.flags.map((flag, i) => (
            <View key={i} style={styles.flagRow}>
              <View style={[styles.flagDot, { backgroundColor: severityColor[flag.severity] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.flagTitle}>{flag.title}</Text>
                <Text style={styles.flagDescription}>{flag.description}</Text>
                {flag.location && <Text style={styles.flagLocation}>{flag.location}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Category scores */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Category Breakdown</Text>
        {report.categoryScores.map((cat, i) => (
          <View key={i} style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{formatCategoryName(cat.category)}</Text>
              <Text style={styles.categoryScore}>{cat.score}</Text>
            </View>
            <View style={styles.categoryTrack}>
              <View style={[styles.categoryFill, { width: `${cat.score}%` }]} />
            </View>
            <Text style={styles.categorySummary}>{cat.summary}</Text>
          </View>
        ))}
      </View>

      {/* Repair estimates */}
      {report.repairEstimates.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Estimated Repair Costs</Text>
          {report.repairEstimates.map((item, i) => (
            <View key={i} style={styles.repairRow}>
              <Text style={styles.repairItem}>{item.item}</Text>
              <Text style={styles.repairCost}>
                {formatNGN(item.estimatedCostNGN[0])} – {formatNGN(item.estimatedCostNGN[1])}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>{report.disclaimer}</Text>
    </ScrollView>
  );
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradeBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  gradeText: { fontSize: 28, fontWeight: '800' },
  heroText: { flex: 1 },
  heroScore: { ...typography.h1, color: colors.textPrimary },
  heroLabel: { ...typography.caption, color: colors.textSecondary },
  heroConfidence: { ...typography.caption, color: colors.gold, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.md },
  odometerValue: { ...typography.h1, color: colors.textPrimary },
  criticalNote: { ...typography.body, color: colors.critical, marginTop: spacing.sm },
  flagRow: { flexDirection: 'row', marginBottom: spacing.md },
  flagDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: spacing.sm },
  flagTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  flagDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  flagLocation: { ...typography.caption, color: colors.gold, marginTop: 2 },
  categoryRow: { marginBottom: spacing.md },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { ...typography.body, color: colors.textPrimary },
  categoryScore: { ...typography.body, color: colors.gold, fontWeight: '700' },
  categoryTrack: {
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  categoryFill: { height: '100%', backgroundColor: colors.gold },
  categorySummary: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  repairRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  repairItem: { ...typography.body, color: colors.textPrimary, flex: 1 },
  repairCost: { ...typography.body, color: colors.silver },
  disclaimer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
