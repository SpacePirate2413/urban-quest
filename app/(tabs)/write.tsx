import React from 'react';
import { Text, View } from 'react-native';

import { AppStyles, Colors, Typography } from '@/src/theme/theme';

export default function WriteScreen() {
  return (
    <View style={[AppStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={Typography.headerMedium}>Writer Studio</Text>
      <Text style={[Typography.body, { marginTop: 8, color: Colors.textSecondary }]}>Craft new realities.</Text>
    </View>
  );
}
