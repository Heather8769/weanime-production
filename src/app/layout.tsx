import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navigation } from '@/components/navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import { ToastProvider } from '@/components/notifications/toast-system'
import { PWAInstallPrompt, OfflineIndicator, UpdateAvailableNotification } from '@/components/pwa-install-prompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kōkai Anime - Stream, Track, Discover',
  description: 'A full-featured anime streaming platform with cinematic design and deep content discovery.',
  keywords: ['anime', 'streaming', 'watch', 'track', 'discover'],
  authors: [{ name: 'Kōkai Anime Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kōkai Anime" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ToastProvider>
            <Providers>
              <div className="min-h-screen bg-background animated-bg">
                <OfflineIndicator />
                <Navigation />
                <main className="pt-16">
                  {children}
                </main>
                <PWAInstallPrompt />
                <UpdateAvailableNotification />
              </div>
            </Providers>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
