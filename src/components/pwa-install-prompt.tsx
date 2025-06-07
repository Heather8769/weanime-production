'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Smartphone, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const checkInstallation = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const isInstalled = isStandaloneMode || isIOSStandalone
      
      setIsStandalone(isInstalled)
      setIsInstalled(isInstalled)
    }

    checkInstallation()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after a delay if not already installed
      if (!isInstalled) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      
      // Show success message
      console.log('PWA was installed successfully')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isInstalled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Don't show if already installed or dismissed
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  // Check if user already dismissed this session
  if (sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <Card className="glass-card border-primary/20 bg-background/95 backdrop-blur-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-white">Install Kōkai Anime</h3>
                  <p className="text-sm text-white/70">
                    Get the full app experience with offline access and faster loading.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Monitor className="w-4 h-4" />
                  <span>Works on desktop and mobile</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstallClick}
                    size="sm"
                    className="anime-gradient hover:opacity-90 glow-effect-hover"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install App
                  </Button>
                  
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// PWA Status Indicator (for debugging)
export function PWAStatus() {
  const [status, setStatus] = useState({
    isInstalled: false,
    isStandalone: false,
    hasServiceWorker: false,
    isOnline: true
  })

  useEffect(() => {
    const updateStatus = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as any).standalone === true
      const isInstalled = isStandaloneMode || isIOSStandalone
      const hasServiceWorker = 'serviceWorker' in navigator
      const isOnline = navigator.onLine

      setStatus({
        isInstalled,
        isStandalone: isInstalled,
        hasServiceWorker,
        isOnline
      })
    }

    updateStatus()

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed top-20 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded">
      <div>PWA Status:</div>
      <div>Installed: {status.isInstalled ? '✅' : '❌'}</div>
      <div>Standalone: {status.isStandalone ? '✅' : '❌'}</div>
      <div>Service Worker: {status.hasServiceWorker ? '✅' : '❌'}</div>
      <div>Online: {status.isOnline ? '✅' : '❌'}</div>
    </div>
  )
}

// Offline indicator
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-16 left-0 right-0 z-50 bg-yellow-500 text-black text-center py-2 text-sm font-medium"
    >
      📡 You're offline. Some features may be limited.
    </motion.div>
  )
}

// Update available notification
export function UpdateAvailableNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg)
        
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        })
      })
    }
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  if (!updateAvailable) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
    >
      <Card className="glass-card border-green-500/20 bg-green-500/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">Update Available</h4>
              <p className="text-sm text-white/70">A new version is ready to install.</p>
            </div>
            <Button
              onClick={handleUpdate}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
