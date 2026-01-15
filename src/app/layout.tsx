import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedLens - Your Medical Document Companion',
  description: 'Understand your medical documents. Track your health over time. Take control of your medical journey.',
  keywords: ['medical', 'health', 'lab results', 'document scanner', 'health tracking', 'MedGemma', 'AI'],
  authors: [{ name: 'MedLens Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MedLens',
  },
  openGraph: {
    title: 'MedLens - Your Medical Document Companion',
    description: 'Understand your medical documents. Track your health over time.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#617361',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen antialiased">
        <div className="relative min-h-screen">
          {/* Subtle background pattern */}
          <div className="fixed inset-0 -z-10 texture-noise" />
          
          {/* Main content */}
          {children}
        </div>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('[PWA] Service worker registered'))
                    .catch(err => console.log('[PWA] SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
