import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MOCK_USER } from '@/src/data/mockData';
import { Colors as UqColors } from '@/src/theme/theme';
import { UserRole } from '@/src/types';

export default function TabLayout() {
  const user = MOCK_USER;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: UqColors.accentYellow,
        tabBarInactiveTintColor: UqColors.textSecondary,
        tabBarStyle: { backgroundColor: UqColors.surface, borderTopColor: UqColors.border },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      {user.role === UserRole.WRITER ? (
        <Tabs.Screen
          name="write"
          options={{
            title: 'Create',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="pencil" color={color} />,
          }}
        />
      ) : null}
    </Tabs>
  );
}
