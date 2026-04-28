import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme/brand';
import { IconHome, IconSearch, IconCalendar, IconTicket, IconUser } from '../../components/Icons';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Bottom padding = system nav bar height + a little breathing room
  const tabBarBottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);
  const tabBarHeight = 56 + tabBarBottomPad;

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
        },
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
