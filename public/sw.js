// Service Worker for WeAnime PWA
const CACHE_NAME = 'weanime-v1.0.0'
const STATIC_CACHE = 'weanime-static-v1.0.0'
const DYNAMIC_CACHE = 'weanime-dynamic-v1.0.0'
const IMAGE_CACHE = 'weanime-images-v1.0.0'
const API_CACHE = 'weanime-api-v1.0.0'

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/browse',
  '/trending',
  '/seasonal',
  '/watchlist',
  '/profile',
  '/manifest.json'
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/trending',
  '/api/seasonal',
  '/api/health'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Service Worker: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      
      // Cache API endpoints
      caches.open(API_CACHE).then((cache) => {
        console.log('Service Worker: Caching API endpoints')
        return Promise.all(
          API_ENDPOINTS.map(url => 
            fetch(url)
              .then(response => response.ok ? cache.put(url, response) : null)
              .catch(() => null) // Ignore failures during install
          )
        )
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== IMAGE_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      console.log('Service Worker: Activation complete')
      return self.clients.claim()
    })
  )
})

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request))
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request))
  } else if (request.mode === 'navigate') {
    // Fix guide implementation for navigation requests
    event.respondWith(
      caches.match('/index.html').catch(() => fetch(request))
    )
  } else {
    event.respondWith(handleNavigationRequest(request))
  }
})

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for:', url.pathname)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for critical endpoints
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'offline',
        message: 'Application is offline'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Return empty array for list endpoints
    if (url.pathname.includes('/api/')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fetch from network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache the image
      const cache = await caches.open(IMAGE_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('Service Worker: Failed to load image:', request.url)
    
    // Return placeholder image
    return new Response(
      '<svg width="300" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#1a1a1a"/><text x="50%" y="50%" text-anchor="middle" fill="#666" font-family="Arial">Image Unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    )
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('Service Worker: Failed to load static asset:', request.url)
    throw error
  }
}

// Handle navigation requests with network-first, fallback to cache
async function handleNavigationRequest(request) {
  const url = new URL(request.url)

  // For navigation requests, always try to serve the main app
  if (request.mode === 'navigate') {
    try {
      // Try network first
      const networkResponse = await fetch(request)

      if (networkResponse.ok) {
        // Only cache non-partial responses (avoid 206 status code errors)
        if (networkResponse.status !== 206) {
          try {
            const cache = await caches.open(DYNAMIC_CACHE)
            await cache.put(request, networkResponse.clone())
          } catch (cacheError) {
            console.warn('Service Worker: Failed to cache response:', cacheError)
          }
        }
        return networkResponse
      }

      throw new Error('Network response not ok')
    } catch (error) {
      console.log('Service Worker: Network failed for navigation:', request.url)

      // For navigation requests, try to serve the main app from cache
      const mainAppResponse = await caches.match('/')
      if (mainAppResponse) {
        return mainAppResponse
      }

      // Try cache for the specific route
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }

      // Fallback to offline page
      const offlineResponse = await caches.match('/offline')
      if (offlineResponse) {
        return offlineResponse
      }
    }
  } else {
    try {
      // Try network first for non-navigation requests
      const networkResponse = await fetch(request)

      if (networkResponse.ok) {
        // Only cache non-partial responses (avoid 206 status code errors)
        if (networkResponse.status !== 206) {
          try {
            const cache = await caches.open(DYNAMIC_CACHE)
            await cache.put(request, networkResponse.clone())
          } catch (cacheError) {
            console.warn('Service Worker: Failed to cache response:', cacheError)
          }
        }
        return networkResponse
      }

      throw new Error('Network response not ok')
    } catch (error) {
      console.log('Service Worker: Network failed for navigation:', request.url)

      // Try cache
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }

      // Fallback to offline page
      const offlineResponse = await caches.match('/offline')
      if (offlineResponse) {
        return offlineResponse
      }
    }
  }
    
    // Last resort - basic offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Kōkai Anime</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #000; 
              color: #fff; 
            }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            .retry-btn { 
              background: #6366f1; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 6px; 
              cursor: pointer; 
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="offline-icon">📡</div>
          <h1>You're Offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
}

// Utility functions
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(new URL(request.url).pathname)
}

function isStaticAsset(request) {
  const url = new URL(request.url)
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/images/') ||
         url.pathname === '/manifest.json' ||
         /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname)
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Sync offline actions when back online
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, action.options)
        await removeOfflineAction(action.id)
      } catch (error) {
        console.log('Service Worker: Failed to sync action:', action.id)
      }
    }
  } catch (error) {
    console.log('Service Worker: Background sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: 'New episodes are available!',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Watch Now'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification('Kōkai Anime', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/browse')
    )
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Helper functions for offline storage
async function getOfflineActions() {
  // This would integrate with IndexedDB to store offline actions
  return []
}

async function removeOfflineAction(id) {
  // This would remove the action from IndexedDB
  return true
}

console.log('Service Worker: Script loaded')
