import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BookMyFit — Development Tracker',
  description: 'Live progress tracker for the BookMyFit platform build',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
