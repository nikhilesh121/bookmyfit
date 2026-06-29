import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View } from 'react-native';

/**
 * System-defined default trainer profile image (Task 3).
 * No image upload exists for trainers — instead we render a consistent
 * gender-based default avatar. Male and female have distinct color treatments
 * so users can tell them apart at a glance. Fully bundled / offline-safe.
 */
type Props = { gender?: string | null; size?: number };

export default function TrainerAvatar({ gender, size = 48 }: Props) {
  const isFemale = String(gender || 'male').toLowerCase() === 'female';
  const gradId = isFemale ? 'tavF' : 'tavM';
  const from = isFemale ? '#FF8FB1' : '#3DA1FF';
  const to = isFemale ? '#C86DD7' : '#0E63D6';
  const skin = isFemale ? '#FFE0CC' : '#F2D2B6';

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        {/* background */}
        <Circle cx="24" cy="24" r="24" fill={`url(#${gradId})`} />
        {/* head */}
        <Circle cx="24" cy="19" r="8" fill={skin} />
        {/* shoulders / body */}
        <Path
          d="M9 44c0-8.3 6.7-14 15-14s15 5.7 15 14z"
          fill={skin}
        />
        {/* simple hair cue to differentiate gender */}
        {isFemale ? (
          <Path d="M16 18c0-5 3.6-9 8-9s8 4 8 9c0 0-1.5-3-8-3s-8 3-8 3z" fill="#5A2A4A" />
        ) : (
          <Path d="M16.5 16c1-4 4-6 7.5-6s6.5 2 7.5 6c-2-2-4.5-2.6-7.5-2.6S18.5 14 16.5 16z" fill="#3A2A1E" />
        )}
      </Svg>
    </View>
  );
}
