import React from 'react';
import { Text, View } from 'react-native';

import { MOCK_QUEST } from '@/src/data/mockData';
import { AppStyles, Colors, Spacing, Typography } from '@/src/theme/theme';

export default function TabTwoScreen() {
  const quest = MOCK_QUEST;

  return (
    <View style={AppStyles.container}>
      <View style={{ padding: Spacing.lg, paddingTop: Spacing.xl }}>
        <Text style={Typography.headerMedium}>Briefing</Text>
        <Text style={[Typography.screenplay, { marginTop: Spacing.md }]}>
          Quest Objective: {quest.title} — {quest.tagline}
        </Text>

        <View style={[AppStyles.card, { marginTop: Spacing.lg }]}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Characters</Text>
          {quest.characters.map((c) => (
            <Text key={c.id} style={[Typography.body, { marginTop: Spacing.xs }]}>
              {c.name}: {c.roleInStory}
            </Text>
          ))}
        </View>

        <View style={[AppStyles.card, { marginTop: Spacing.md }]}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>Waypoints</Text>
          {quest.waypoints
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((wp) => (
              <View key={wp.id} style={{ marginTop: Spacing.sm }}>
                <Text style={Typography.body}>
                  {wp.order}. {wp.title}
                </Text>
                <Text style={[Typography.caption, { marginTop: Spacing.xs }]}>{wp.description}</Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}
