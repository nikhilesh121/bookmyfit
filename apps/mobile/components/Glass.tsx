import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme/brand';

interface GlassProps extends ViewProps {
  intensity?: number;
  radiusSize?: number;
  dark?: boolean;
  tint?: 'light' | 'dark' | 'default';
}

// True glassmorphism panel: BlurView + rgba bg + 1px white border.
// Falls back to rgba+borderColor on platforms where BlurView is unavailable.
export function Glass({ children, style, intensity = 40, radiusSize = radius.lg, dark = false, tint = 'dark', ...rest }: GlassProps) {
  return (
    <View style={[{ borderRadius: radiusSize, overflow: 'hidden' }, style]} {...rest}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFill, { backgroundColor: dark ? colors.glassDark : colors.glass }]}
      />
      <View style={{ borderRadius: radiusSize, borderWidth: 1, borderColor: colors.borderGlass, flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
