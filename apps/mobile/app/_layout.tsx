import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography } from '@/src/theme/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSplashVisible, setSplashVisible] = React.useState(true);

  React.useEffect(() => {
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
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
