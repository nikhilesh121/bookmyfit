import './globals.css';
import { ToastProvider } from '../components/Toast';
import ClientLayout from '../components/ClientLayout';
export const metadata = { title: 'BookMyFit Corporate', description: 'Corporate HR portal' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
        <ToastProvider />
      </body>
    </html>
  );
}
