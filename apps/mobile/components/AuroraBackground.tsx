import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/brand';

const { width, height } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
  variant?: 'default' | 'gym' | 'premium' | 'store';
  style?: any;
}

// Aurora color configs per screen variant
// Brand palette: #CCFF00 neon yellow-green (primary) + #FF1E5A hot pink-red (secondary) + #FF5000 deep orange-red (tertiary)
const AURORA_CONFIGS: Record<string, { c1: string; c2: string; c3: string }> = {
  default:  { c1: 'rgba(204,255,0,0.09)',  c2: 'rgba(255,30,90,0.08)',   c3: 'rgba(255,80,0,0.05)'  },
  gym:      { c1: 'rgba(204,255,0,0.11)',  c2: 'rgba(255,30,90,0.09)',   c3: 'rgba(255,80,0,0.06)'  },
  premium:  { c1: 'rgba(255,30,90,0.11)',  c2: 'rgba(204,255,0,0.08)',   c3: 'rgba(255,80,0,0.06)'  },
  store:    { c1: 'rgba(204,255,0,0.08)',  c2: 'rgba(255,80,0,0.07)',    c3: 'rgba(255,30,90,0.06)' },
};

export default function AuroraBackground({ children, variant = 'default', style }: Props) {
  const cfg = AURORA_CONFIGS[variant] || AURORA_CONFIGS.default;

  return (
    <View style={[styles.root, style]}>
      {/* Base dark background */}
      <View style={styles.base} />

      {/* Aurora blob 1 — top-left yellowish-neon */}
      <LinearGradient
        colors={[cfg.c1, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.blob, styles.blobTopLeft]}
      />
      {/* Aurora blob 2 — top-right blue */}
      <LinearGradient
        colors={[cfg.c2, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.blob, styles.blobTopRight]}
      />
      {/* Aurora blob 3 — center-bottom purple */}
      <LinearGradient
        colors={[cfg.c3, 'transparent']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={[styles.blob, styles.blobBottom]}
      />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const BLOB_SIZE = width * 1.4;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg },
  blob: {
    position: 'absolute',
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
  },
  blobTopLeft: { top: -BLOB_SIZE * 0.4, left: -BLOB_SIZE * 0.3 },
  blobTopRight: { top: -BLOB_SIZE * 0.3, right: -BLOB_SIZE * 0.3 },
  blobBottom: { bottom: -BLOB_SIZE * 0.4, left: -BLOB_SIZE * 0.1 },
  content: { flex: 1 },
});
