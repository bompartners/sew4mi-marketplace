import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Sew4Mi - Connect with Ghana's Finest Tailors",
  description:
    'Digital marketplace connecting customers with skilled Ghanaian tailors. Custom clothing, traditional craftsmanship, modern convenience, and secure mobile money payments.',
  keywords: [
    'Ghana tailors',
    'custom clothing',
    'mobile money',
    'Ghanaian fashion',
    'traditional clothing',
    'marketplace',
  ],
  authors: [{ name: 'Sew4Mi Team' }],
  openGraph: {
    title: "Sew4Mi - Ghana's Premier Tailoring Marketplace",
    description:
      'Connect with skilled Ghanaian tailors for custom clothing with traditional craftsmanship and modern convenience.',
    siteName: 'Sew4Mi',
    locale: 'en_GH',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
