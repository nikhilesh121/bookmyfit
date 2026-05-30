import AppLoadingScreen from '../components/AppLoadingScreen';
import { DEFAULT_LAUNCH_CONFIG } from '../lib/launchConfig';

export default function StartupScreen() {
  return <AppLoadingScreen launchConfig={DEFAULT_LAUNCH_CONFIG} />;
}
