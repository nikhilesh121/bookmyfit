import { Tabs, router, useFocusEffect, usePathname } from 'expo-router';
import { Alert, BackHandler, Platform } from 'react-native';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme/brand';
import { IconHome, IconSearch, IconCalendar, IconTicket, IconUser } from '../../components/Icons';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  // Some Android devices report a tiny inset while the 3-button nav bar still overlaps UI.
  const tabBarBottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 30 : 10);
  const tabBarHeight = 62 + tabBarBottomPad;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (pathname && pathname !== '/') {
          router.replace('/(tabs)' as any);
          return true;
        }

        Alert.alert('Exit BookMyFit', 'Do you want to close the app?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      });
      return () => sub.remove();
    }, [pathname]),
  );

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: tabBarBottomPad,
          elevation: 18,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 12,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.t2,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 0.3 },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <IconHome size={20} color={color} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: ({ color }) => <IconCalendar size={20} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <IconSearch size={20} color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'Passes', tabBarIcon: ({ color }) => <IconTicket size={20} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconUser size={20} color={color} /> }} />
      <Tabs.Screen name="store" options={{ href: null }} />
    </Tabs>
  );
}
