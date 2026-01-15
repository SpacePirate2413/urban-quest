import React from 'react';
import { Text, View } from 'react-native';

import { MOCK_QUEST } from '@/src/data/mockData';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';

export default function HomeScreen() {
  const quest = MOCK_QUEST;

  return (
    <View style={AppStyles.container}>
      <View style={{ padding: Spacing.lg, paddingTop: Spacing.xl }}>
        <Text style={Typography.headerLarge}>URBAN QUEST</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm }]}>
          Choose your next mission.
        </Text>

        <View style={[AppStyles.card, { marginTop: Spacing.lg }]}>
          <Text style={Typography.headerMedium}>{quest.title}</Text>
          <Text style={[Typography.caption, { marginTop: Spacing.xs }]}>{quest.tagline}</Text>
          <Text style={[Typography.body, { marginTop: Spacing.sm }]}>{quest.description}</Text>

          <View style={{ marginTop: Spacing.md }}>
            <Text style={Typography.caption}>
              Waypoints: {quest.waypoints.length} · Difficulty: {quest.difficultyLevel} / 5 · Players:{' '}
              {quest.playerCount}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
