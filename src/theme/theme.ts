import { StyleSheet, TextStyle } from 'react-native';

export const Colors = {
  primaryBackground: '#0B1026',
  accentYellow: '#FFD700',
  accentRed: '#FF3333',
  accentCyan: '#00FFFF',
  surface: '#162044',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A8C0',
  border: '#2A3A60',
  success: '#00CC66',
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
