import { Tabs } from 'expo-router';
import { colors, fonts } from '../../theme/brand';
import { IconHome, IconSearch, IconCreditCard, IconShopping, IconUser } from '../../components/Icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.t3,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 0.3 },
        headerStyle: { backgroundColor: colors.bg, borderBottomWidth: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontFamily: fonts.serif, fontSize: 18, color: '#fff' },
        headerTintColor: colors.accent,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: ({ color }) => <IconHome size={20} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', headerShown: false, tabBarIcon: ({ color }) => <IconSearch size={20} color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'My Plans', headerShown: false, tabBarIcon: ({ color }) => <IconCreditCard size={20} color={color} /> }} />
      <Tabs.Screen name="store" options={{ title: 'Store', headerShown: false, tabBarIcon: ({ color }) => <IconShopping size={20} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false, tabBarIcon: ({ color }) => <IconUser size={20} color={color} /> }} />
    </Tabs>
  );
}
