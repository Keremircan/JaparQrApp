import { ActivityIndicator, View } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider, useSession } from '@/context/session';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}

function SplashScreenController() {
  const { isLoading } = useSession();

  if (!isLoading) {
    SplashScreen.hide();
  }

  return null;
}

function RootNavigator() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
