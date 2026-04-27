import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '../theme/brand';

interface GlassProps extends ViewProps {
  intensity?: number;
  radiusSize?: number;
  dark?: boolean;
  tint?: 'light' | 'dark' | 'default';
  accentGlow?: boolean;
}

// iOS 26-style Liquid Glass: BlurView (real blur on iOS) + gradient bg + specular top highlight.
// Falls back gracefully on Android with a slightly stronger surface bg.
export function Glass({
  children, style,
  intensity = 60,
  radiusSize = radius.lg,
  dark = false,
  tint = 'dark',
  accentGlow = false,
  ...rest
}: GlassProps) {
  const glowBorder = accentGlow ? colors.accentBorder : colors.borderGlass;

  return (
    <View
      style={[{ borderRadius: radiusSize, overflow: 'hidden' }, style]}
      {...rest}
    >
      {/* True blur layer — iOS/macOS only; Android renders it as transparent */}
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: dark
              ? 'rgba(0,0,0,0.50)'
              : Platform.OS === 'android'
              ? 'rgba(255,255,255,0.10)'   // Android fallback
              : dark ? colors.glassDark : colors.glass,
          },
        ]}
      />
      {/* Content + border + specular top edge */}
      <View
        style={{
          borderRadius: radiusSize,
          borderWidth: 1,
          borderColor: glowBorder,
          flex: 1,
          // Specular highlight on top edge (iOS liquid-glass signature)
          shadowColor: '#ffffff',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 0,
        }}
      >
        {children}
      </View>
    </View>
  );
}

