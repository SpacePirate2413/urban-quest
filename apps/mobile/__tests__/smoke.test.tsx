import React from 'react';
import { Text, View } from 'react-native';
import { Colors, Typography } from '../src/theme/theme';

describe('Mobile App Smoke Tests', () => {
  it('should have React available', () => {
    expect(React.version).toBeDefined();
  });

  it('should have React Native components available', () => {
    expect(View).toBeDefined();
    expect(Text).toBeDefined();
  });

  it('should be able to import theme', () => {
    expect(Colors).toBeDefined();
    expect(Typography).toBeDefined();
  });

  it('should have theme colors defined', () => {
    expect(Colors.primaryBackground).toBeDefined();
  });
});
