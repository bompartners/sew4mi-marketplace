import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

export const metadata: Metadata = {
  title: 'Sew4Mi',
  description: 'Connect with skilled Ghanaian tailors',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <OfflineIndicator />
          {children}
        </Providers>
      </body>
    </html>
  );
}
