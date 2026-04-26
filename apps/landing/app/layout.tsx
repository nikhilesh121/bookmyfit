import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://bookmyfit.in'),
  title: 'BookMyFit — One App, Every Gym in India',
  description: "India's first AI-powered multi-gym fitness platform. Get unlimited access to 1,000+ premium gyms across India with a single subscription. Join the early access waitlist.",
  keywords: 'gym subscription india, multi gym access, fitness app india, gym membership app, BookMyFit, corporate wellness, gym pass india',
  authors: [{ name: 'BookMyFit' }],
  robots: 'index, follow',
  alternates: { canonical: 'https://bookmyfit.in/' },
  openGraph: {
    type: 'website',
    title: 'BookMyFit — One App, Every Gym in India',
    description: "India's first AI-powered multi-gym fitness platform. Access 1,000+ premium gyms with a single subscription.",
    url: 'https://bookmyfit.in/',
    siteName: 'BookMyFit',
    images: [{ url: 'https://bookmyfit.in/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BookMyFit — One App, Every Gym in India',
    description: "India's first AI-powered multi-gym fitness platform.",
    images: ['https://bookmyfit.in/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'BookMyFit',
              url: 'https://bookmyfit.in',
              description: "India's first AI-powered multi-gym fitness platform.",
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://bookmyfit.in/search?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
