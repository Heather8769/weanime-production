'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

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

  const handleRetry = async () => {
    setIsRetrying(true)
    
    try {
      await fetch('/api/health', { cache: 'no-cache' })
      window.location.href = '/'
    } catch {
      setTimeout(() => setIsRetrying(false), 1000)
    }
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full border border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-red-500/20 w-fit">
            {isOnline ? (
              <Wifi className="h-8 w-8 text-green-500" />
            ) : (
              <WifiOff className="h-8 w-8 text-red-500" />
            )}
          </div>
          <CardTitle className="text-white text-2xl">
            {isOnline ? 'Connection Restored' : 'You\'re Offline'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-gray-300">
            {isOnline 
              ? 'Your internet connection has been restored. You can now browse anime again.'
              : 'Please check your internet connection and try again. Some cached content may still be available.'
            }
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={isOnline ? handleGoHome : handleRetry}
              disabled={isRetrying}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : isOnline ? (
                'Go to Home'
              ) : (
                'Retry Connection'
              )}
            </Button>
            
            {!isOnline && (
              <Button 
                variant="outline" 
                onClick={handleGoHome}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Browse Cached Content
              </Button>
            )}
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Tip: You can still access previously viewed anime and your watchlist while offline.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}