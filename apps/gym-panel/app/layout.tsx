import './globals.css';
import { ToastProvider } from '../components/Toast';
import ClientLayout from '../components/ClientLayout';
export const metadata = { title: 'BookMyFit Gym Partner', description: 'Gym partner portal' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ClientLayout>{children}</ClientLayout><ToastProvider /></body></html>;
}
