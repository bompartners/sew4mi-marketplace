import './globals.css';
import type { Metadata } from 'next';
import { HydrationBoundary } from '@/components/common/HydrationBoundary';

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
      <body suppressHydrationWarning>
        <HydrationBoundary 
          fallback={
            <div 
              style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }}></div>
                <p style={{ color: '#666', fontSize: '16px' }}>Loading...</p>
              </div>
            </div>
          }
        >
          {children}
        </HydrationBoundary>
      </body>
    </html>
  );
}
