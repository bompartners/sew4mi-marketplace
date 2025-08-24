import './globals.css';
import type { Metadata } from 'next';
import { CacheStats } from '@/components/debug/CacheStats';

export const metadata: Metadata = {
  title: 'Sew4Mi',
  description: 'Connect with skilled Ghanaian tailors',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Development debugging component - only shows in dev mode */}
        <CacheStats />
      </body>
    </html>
  );
}
