import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/src/theme/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, { icon: string; color: string }> = {
    play: { icon: '🎮', color: Colors.cyan },
    write: { icon: '📍', color: Colors.neonGreen },
    profile: { icon: '👤', color: Colors.purple },
  };

  const { icon, color } = icons[name];

  return (
    <View style={[styles.iconContainer, focused && { backgroundColor: `${color}15`, borderColor: color }]}>
      <Text style={[styles.icon, { opacity: focused ? 1 : 0.5 }]}>{icon}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1.5,
          height: 88,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarIcon: ({ focused }) => <TabIcon name="play" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Scout',
          tabBarIcon: ({ focused }) => <TabIcon name="write" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  icon: {
    fontSize: 22,
  },
});
