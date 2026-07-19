/**
 * AUTOVERSE — Financing Calculator
 *
 * Estimates a reducing-balance auto loan at a representative Nigerian
 * bank/fintech rate (22% p.a.) — NOT a loan offer or pre-approval,
 * purely an affordability estimate shown on the listing to help buyers
 * gauge monthly commitment before contacting a dealer or lender.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';
import Chip from './Chip';

interface Props {
  priceNGN: number;
}

const ANNUAL_RATE = 0.22; // 22% p.a. — representative Nigerian auto loan rate
const DOWN_PAYMENT_OPTIONS = [0.1, 0.2, 0.3, 0.5];
const TERM_OPTIONS_MONTHS = [12, 24, 36, 48, 60];

function formatNGN(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

export default function FinancingCalculator({ priceNGN }: Props) {
  const [downPaymentPct, setDownPaymentPct] = useState(0.2);
  const [termMonths, setTermMonths] = useState(36);

  const { downPayment, principal, monthlyPayment, totalRepayment, totalInterest } = useMemo(() => {
    const downPayment = priceNGN * downPaymentPct;
    const principal = priceNGN - downPayment;
    const monthlyPayment = calculateMonthlyPayment(principal, ANNUAL_RATE, termMonths);
    const totalRepayment = monthlyPayment * termMonths;
    const totalInterest = totalRepayment - principal;
    return { downPayment, principal, monthlyPayment, totalRepayment, totalInterest };
  }, [priceNGN, downPaymentPct, termMonths]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Financing Estimate</Text>
      <Text style={styles.subtitle}>At {(ANNUAL_RATE * 100).toFixed(0)}% p.a., reducing balance</Text>

      <Text style={styles.fieldLabel}>Down payment</Text>
      <View style={styles.chipRow}>
        {DOWN_PAYMENT_OPTIONS.map((pct) => (
          <Chip
            key={pct}
            label={`${Math.round(pct * 100)}%`}
            active={downPaymentPct === pct}
            onPress={() => setDownPaymentPct(pct)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Loan term</Text>
      <View style={styles.chipRow}>
        {TERM_OPTIONS_MONTHS.map((months) => (
          <Chip
            key={months}
            label={`${months} mo`}
            active={termMonths === months}
            onPress={() => setTermMonths(months)}
          />
        ))}
      </View>

      <View style={styles.resultBlock}>
        <Text style={styles.monthlyLabel}>Estimated monthly payment</Text>
        <Text style={styles.monthlyValue}>{formatNGN(monthlyPayment)}</Text>

        <View style={styles.breakdownRow}>
          <BreakdownItem label="Down payment" value={formatNGN(downPayment)} />
          <BreakdownItem label="Loan amount" value={formatNGN(principal)} />
        </View>
        <View style={styles.breakdownRow}>
          <BreakdownItem label="Total interest" value={formatNGN(totalInterest)} />
          <BreakdownItem label="Total repayment" value={formatNGN(totalRepayment)} />
        </View>
      </View>

      <Text style={styles.disclaimer}>
        Estimate only — not a loan offer. Actual rates and terms vary by lender and depend on
        your credit profile. Speak with a financing partner for a formal quote.
      </Text>
    </View>
  );
}

function BreakdownItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownItem}>
      <Text style={styles.breakdownValue}>{value}</Text>
      <Text style={styles.breakdownLabel}>{label}</Text>
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
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  resultBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  monthlyLabel: { ...typography.caption, color: colors.textSecondary },
  monthlyValue: { ...typography.h1, color: colors.gold, marginTop: 2 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  breakdownItem: {},
  breakdownValue: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  breakdownLabel: { ...typography.caption, color: colors.textSecondary },
  disclaimer: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.lg },
});
