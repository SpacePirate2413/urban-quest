// src/navigation/AppNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Text, View } from 'react-native';

import { Colors, Typography } from '../theme/theme';

// --- Placeholder Screens ---

const SplashScreen = () => (
  <View style={{ flex: 1, backgroundColor: Colors.primaryBackground, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={Typography.headerLarge}>URBAN QUEST</Text>
  </View>
);

const PlayHomeScreen = () => (
  <View style={{ flex: 1, backgroundColor: Colors.primaryBackground, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={Typography.headerMedium}>Available Quests</Text>
    <Text style={Typography.body}>Find your next adventure here.</Text>
  </View>
);

const WriteDashboardScreen = () => (
  <View style={{ flex: 1, backgroundColor: Colors.primaryBackground, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={Typography.headerMedium}>Writer Studio</Text>
    <Text style={Typography.body}>Craft new realities.</Text>
  </View>
);

// --- Navigation Setup ---

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const PlayStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.surface },
      headerTintColor: Colors.accentCyan,
      headerTitleStyle: { fontWeight: '900' },
    }}
  >
    <Stack.Screen name="QuestFeed" component={PlayHomeScreen} options={{ title: 'Missions' }} />
  </Stack.Navigator>
);

const WriteStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: Colors.surface },
      headerTintColor: Colors.accentYellow,
      headerTitleStyle: { fontWeight: '900' },
    }}
  >
    <Stack.Screen name="WriterDashboard" component={WriteDashboardScreen} options={{ title: 'Studio' }} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: Colors.accentYellow,
      tabBarInactiveTintColor: Colors.textSecondary,
      tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
      headerShown: false,
    }}
  >
    <Tab.Screen name="PlayTab" component={PlayStack} options={{ tabBarLabel: 'PLAY' }} />
    <Tab.Screen name="WriteTab" component={WriteStack} options={{ tabBarLabel: 'CREATE' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const [isSplashVisible, setSplashVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <NavigationContainer>
      {isSplashVisible ? <SplashScreen /> : <MainTabs />}
    </NavigationContainer>
  );
};