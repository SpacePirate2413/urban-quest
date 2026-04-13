import { StyleSheet, TextStyle } from 'react-native';

export const Colors = {
  // Core backgrounds - matching Creator Station
  primaryBackground: '#0a1628',  // navy-deep
  surface: '#111827',            // panel
  border: '#1e293b',             // panel-border
  inputBg: '#0f172a',            // input-bg
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',      // slate-400
  textMuted: '#64748b',          // slate-500
  
  // Accent colors - matching Creator Station
  cyan: '#00d4ff',
  neonGreen: '#39ff14',
  hotPink: '#ff2d78',
  yellow: '#ffd60a',
  purple: '#a855f7',
  orange: '#ff6b2b',
  electricBlue: '#4a90d9',
  
  // Legacy aliases for compatibility
  accentYellow: '#ffd60a',
  accentCyan: '#00d4ff',
  accentRed: '#ff2d78',
  success: '#39ff14',
};

export const Typography = {
  headerLarge: {
    fontFamily: 'Impact',
    fontSize: 32,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,

  headerMedium: {
    fontFamily: 'Arial-Black',
    fontSize: 20,
    color: Colors.accentYellow,
    fontWeight: '900',
  } as TextStyle,

  body: {
    fontFamily: 'Arial',
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  } as TextStyle,

  screenplay: {
    fontFamily: 'Courier New',
    fontSize: 16,
    color: Colors.accentCyan,
    lineHeight: 22,
    fontStyle: 'italic',
  } as TextStyle,

  caption: {
    fontFamily: 'Arial',
    fontSize: 12,
    color: Colors.textSecondary,
  } as TextStyle,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const AppStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBackground,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
});
