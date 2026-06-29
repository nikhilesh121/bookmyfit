import { ViewStyle } from 'react-native';
import { Glass } from './Glass';
import { radius } from '../theme/brand';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glow?: boolean;
  glowColor?: string;
  /** Accent-tinted highlighted card. */
  featured?: boolean;
  /** Corner radius (defaults to radius.xl). */
  radiusSize?: number;
  /** Blur strength. */
  intensity?: number;
}

// Drop-in liquid-glass card. Pass padding / margin / layout via `style`.
export default function GlassCard({
  children,
  style,
  glow,
  glowColor,
  featured,
  radiusSize = radius.xl,
  intensity = 40,
}: Props) {
  return (
    <Glass
      radiusSize={radiusSize}
      intensity={intensity}
      featured={featured}
      accentGlow={glow}
      glowColor={glowColor}
      style={style}
    >
      {children}
    </Glass>
  );
}
