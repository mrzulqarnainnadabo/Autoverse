/**
 * AUTOVERSE design tokens — dark-luxury, matches the AV brand mark
 * (gold #D4AF37 / silver accents on near-black).
 */

export const colors = {
  background: '#0A0A0A',
  surface: '#151515',
  surfaceElevated: '#1F1F1F',
  border: '#2A2A2A',
  gold: '#D4AF37',
  goldMuted: '#8C7526',
  silver: '#C7C9CC',
  textPrimary: '#F5F5F3',
  textSecondary: '#9C9C9C',
  success: '#3FA76A',
  warning: '#E0A526',
  caution: '#E07C26',
  critical: '#D64545',
};

export const gradeColor: Record<string, string> = {
  A: colors.success,
  B: '#8AB86A',
  C: colors.warning,
  D: colors.caution,
  F: colors.critical,
};

export const severityColor: Record<string, string> = {
  info: colors.silver,
  watch: colors.warning,
  caution: colors.caution,
  critical: colors.critical,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.5 },
  h2: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.3 },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
};
