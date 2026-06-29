import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme/brand';

interface GlassProps extends ViewProps {
  /** Blur strength (0-100). Higher = frostier. */
  intensity?: number;
  /** Corner radius of the glass surface. */
  radiusSize?: number;
  tint?: 'light' | 'dark' | 'default';
  /** Accent-tinted "featured" variant (mirrors website .glass-card-featured). */
  featured?: boolean;
  /** Adds an accent border + outer glow. */
  accentGlow?: boolean;
  /** Custom glow / accent color. */
  glowColor?: string;
}

// Liquid-glass surface mirroring the bookmyfit.in website .glass-card recipe:
//   linear-gradient white tint  +  backdrop blur(saturate/brightness)  +  inset top highlight.
// Real backdrop blur renders on iOS natively and on Android via the
// experimental "dimezisBlurView" method (expo-blur >= 13).
export function Glass({
  children,
  style,
  intensity = 40,
  radiusSize = radius.xl,
  tint = 'dark',
  featured = false,
  accentGlow = false,
  glowColor,
  ...rest
}: GlassProps) {
  const accent = glowColor || colors.accent;
  const borderColor = featured || accentGlow ? colors.accentBorder : colors.borderGlass;

  // 140deg-ish diagonal white tint (featured = accent-tinted), matching the site.
  const gradientColors: [string, string] = featured
    ? [`${hexToRgba(accent, 0.12)}`, 'rgba(255,255,255,0.035)']
    : ['rgba(255,255,255,0.075)', 'rgba(255,255,255,0.03)'];

  return (
    <View
      style={[
        { borderRadius: radiusSize, borderWidth: 1, borderColor, overflow: 'hidden' },
        styles.shadow,
        accentGlow && { shadowColor: accent, shadowOpacity: 0.4, shadowRadius: 18, elevation: 10 },
        style,
      ]}
      {...rest}
    >
      {/* Real backdrop blur layer */}
      <BlurView
        intensity={intensity}
        tint={tint}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      {/* White (or accent) glass tint gradient */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Specular highlight on the top edge (liquid-glass signature) */}
      <View pointerEvents="none" style={styles.topHighlight} />
      {children}
    </View>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(0,212,106,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 6,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
});
