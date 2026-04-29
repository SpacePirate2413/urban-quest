import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initializeAdStack } from '@/src/lib/adConsent';
import { configureRevenueCat } from '@/src/hooks/useSubscription';
import { useAuthStore } from '@/src/store';
import { Colors, Typography } from '@/src/theme/theme';

configureRevenueCat();
// Fire-and-forget: AdMob + UMP + ATT bootstrap. Doesn't block app render.
initializeAdStack();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSplashVisible, setSplashVisible] = React.useState(true);

  React.useEffect(() => {
    // Verify cached auth tokens against the API on every boot. If a token
    // exists, this populates the user (including bio / genres / role) so the
    // Profile screen has real data the first time it renders. If it fails,
    // the user lands on the login screen — that's the right outcome.
    useAuthStore.getState().initAuth();

    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isSplashVisible) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primaryBackground,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text style={Typography.headerLarge}>URBAN QUEST</Text>
        <Text style={[Typography.caption, { color: Colors.textSecondary, marginTop: 8 }]}>
          Location-based adventures
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.primaryBackground } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quest/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="quest/checkout" options={{ presentation: 'modal' }} />
        <Stack.Screen name="quest/play" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="profile/premium" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/location" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/notifications" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/payments" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/quests" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/completed" options={{ presentation: 'modal' }} />
        <Stack.Screen name="profile/reviews" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
