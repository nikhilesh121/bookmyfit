import { Tabs } from 'expo-router';
import { colors, fonts } from '../../theme/brand';
import { IconQR, IconUser, IconDumbbell, IconDollar, IconCheck } from '../../components/Icons';

export default function GymPortalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.t2,
        tabBarLabelStyle: { fontFamily: fonts.sansBold, fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconDumbbell size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan QR',
          tabBarIcon: ({ color }) => <IconQR size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color }) => <IconUser size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => <IconDollar size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kyc"
        options={{
          title: 'KYC',
          tabBarIcon: ({ color }) => <IconCheck size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
