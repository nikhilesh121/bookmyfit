import { Tabs } from 'expo-router';
import { colors, fonts } from '../../theme/brand';
import { IconHome, IconSearch, IconCalendar, IconTicket, IconUser } from '../../components/Icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.30)',
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 0.3 },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <IconHome size={20} color={color} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: ({ color }) => <IconCalendar size={20} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <IconSearch size={20} color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'Passes', tabBarIcon: ({ color }) => <IconTicket size={20} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <IconUser size={20} color={color} /> }} />
    </Tabs>
  );
}
