import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Navigation } from '@/components/navigation'
import { ErrorBoundary } from '@/components/error-boundary'
import { ToastProvider } from '@/components/notifications/toast-system'
import { PWAInstallPrompt, OfflineIndicator, UpdateAvailableNotification } from '@/components/pwa-install-prompt'
import { ErrorCollectorProvider } from '@/components/error-collector-provider'
import { FeedbackSystem } from '@/components/feedback-system'
import { PerformanceMonitor } from '@/components/performance-monitor'
import { DiagnosticsProvider } from '@/components/diagnostics-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WeAnime - Real Crunchyroll Streaming',
  description: 'Authentic anime streaming platform powered by real Crunchyroll content - no mock data.',
  keywords: ['anime', 'streaming', 'crunchyroll', 'real', 'authentic', 'watch'],
  authors: [{ name: 'WeAnime Team' }],
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
        <meta name="apple-mobile-web-app-title" content="WeAnime" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ErrorCollectorProvider>
            <DiagnosticsProvider>
              <PerformanceMonitor />
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
                  <FeedbackSystem />
                </div>
              </Providers>
              </ToastProvider>
            </DiagnosticsProvider>
          </ErrorCollectorProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
