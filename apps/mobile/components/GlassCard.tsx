import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme/brand';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glow?: boolean;
  glowColor?: string;
}

export default function GlassCard({ children, style, glow, glowColor }: Props) {
  return (
    <View style={[
      styles.card,
      glow && {
        shadowColor: glowColor || colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 8,
      },
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
});
