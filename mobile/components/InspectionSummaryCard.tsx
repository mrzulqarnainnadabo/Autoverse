/**
 * AUTOVERSE — InspectionSummaryCard
 * A condensed, conversion-focused rendering of an AutoInspect report
 * for the car detail page — leads with the score/grade, surfaces the
 * top positives and issues, and links out to the full report rather
 * than replicating the entire AutoInspectReportScreen inline.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography, gradeColor, severityColor } from '../constants/theme';
import { PublicListingDetail } from '../types/search.types';

interface Props {
  autoInspect: NonNullable<PublicListingDetail['autoInspect']>;
  onViewFullReport?: () => void;
}

export default function InspectionSummaryCard({ autoInspect, onViewFullReport }: Props) {
  const positives = autoInspect.categoryScores
    .filter((c) => c.score >= 80)
    .slice(0, 2);
  const issues = autoInspect.flags
    .filter((f) => f.severity === 'caution' || f.severity === 'critical')
    .slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.gradeBadge, { borderColor: gradeColor[autoInspect.grade] }]}>
          <Text style={[styles.gradeText, { color: gradeColor[autoInspect.grade] }]}>{autoInspect.grade}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI AutoInspect Trust Score</Text>
          <Text style={styles.scoreValue}>{autoInspect.overallScore}/100</Text>
        </View>
      </View>

      {positives.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What looks good</Text>
          {positives.map((p, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: colors.success }]} />
              <Text style={styles.bulletText}>{p.summary}</Text>
            </View>
          ))}
        </View>
      )}

      {issues.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Worth knowing</Text>
          {issues.map((f, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: severityColor[f.severity] }]} />
              <Text style={styles.bulletText}>{f.title}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.noIssuesText}>No caution or critical findings from this inspection.</Text>
        </View>
      )}

      <Pressable style={styles.linkButton} onPress={onViewFullReport}>
        <Text style={styles.linkButtonText}>View full AutoInspect report →</Text>
      </Pressable>

      <Text style={styles.disclaimer}>{autoInspect.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  gradeBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  gradeText: { fontSize: 20, fontWeight: '800' },
  headerTitle: { ...typography.label, color: colors.textSecondary },
  scoreValue: { ...typography.h1, color: colors.textPrimary },
  section: { marginTop: spacing.sm },
  sectionLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, marginRight: spacing.sm },
  bulletText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  noIssuesText: { ...typography.caption, color: colors.success },
  linkButton: { marginTop: spacing.md },
  linkButtonText: { ...typography.body, color: colors.gold, fontWeight: '600' },
  disclaimer: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});
