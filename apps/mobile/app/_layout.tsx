import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_900Black, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { colors } from '../theme/brand';
import { getToken, getUser } from '../lib/api';

async function resolveInitialRoute() {
  try {
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const user = await getUser();
    if (user?.role === 'gym_owner' || user?.role === 'gym_staff') {
      router.replace('/(gym-portal)');
    } else {
      router.replace('/(tabs)');
    }
  } catch {
    router.replace('/login');
  }
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlayfairDisplay_700Bold, PlayfairDisplay_900Black, PlayfairDisplay_400Regular_Italic,
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      resolveInitialRoute();
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerTitleStyle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18 },
        contentStyle: { backgroundColor: colors.bg },
      }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="otp" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(gym-portal)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="gym/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="qr" options={{ headerShown: false }} />
        <Stack.Screen name="plans" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="duration" options={{ headerShown: false }} />
        <Stack.Screen name="order" options={{ headerShown: false }} />
        <Stack.Screen name="success" options={{ headerShown: false }} />
        <Stack.Screen name="checkin-result" options={{ headerShown: false }} />
        <Stack.Screen name="videos" options={{ headerShown: false }} />
        <Stack.Screen name="review" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="invoice" options={{ headerShown: false }} />
        <Stack.Screen name="trainers" options={{ headerShown: false }} />
        <Stack.Screen name="slots" options={{ headerShown: false }} />
        <Stack.Screen name="wellness" options={{ headerShown: false }} />
        <Stack.Screen name="subscription-detail" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="payment-webview" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}
