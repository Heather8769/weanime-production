# Weanime.live Deployment: Console Debug & Fix Log

## ✅ 1. Meta Tag Warning
**Warning:**
```html
<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated
```

**Fix:**
Replace with the modern tag:
```html
<meta name="mobile-web-app-capable" content="yes">
```
Update this in `_document.tsx` or `index.html` depending on your frontend framework.

---

## 🚫 2. API Endpoint 404 Errors
**Errors:**
- `POST /api/anilist 404`
- `POST /api/monitoring/error 404`
- `POST /api/errors 404`

**Causes:**
These endpoints are being hit by the frontend but do **not exist** or are **not routed correctly** in your backend.

**Fixes:**
- Ensure these endpoints are defined in your Node.js/Express or API route handler:

### Express Route Example
```js
app.post("/api/anilist", (req, res) => {
  // TODO: Implement logic here
  res.status(200).json({ message: "Anilist endpoint stub" });
});
```

### Next.js API Example
```js
// pages/api/anilist.ts
export default function handler(req, res) {
  if (req.method === 'POST') {
    // TODO: Logic here
    res.status(200).json({ message: 'Handled by /api/anilist' });
  }
}
```

### Optional Proxy in Next.js
```js
rewrites: async () => [
  { source: '/api/anilist', destination: 'https://your-backend-url/api/anilist' },
],
```

---

## 📉 3. Performance Monitoring Warning
**Message:**
```
Performance monitoring temporarily disabled to prevent infinite loops
```

**Fix:**
Likely caused by unthrottled metrics or logs in re-rendering components.
- Add `useEffect` dependency arrays
- Clean up observers on unmount
- Debounce or throttle performance logs

---

## 🕸️ 4. Service Worker Network Failures
**Message:**
```
Service Worker: Network failed for navigation
```

**Fix:**
Update `sw.js` with fallback logic:
```js
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').catch(() => fetch(event.request))
    );
  }
});
```
Ensure all dynamic routes (`/browse`, `/trending`, `/auth/login`) have proper fallback.

---

## 📺 5. Recently Watched Episodes Missing
**Message:**
```
Episode service: Found 0 recent episodes
```

**Fix:**
- Validate that Supabase has entries
- Ensure proper filtering by `user_id`
- Confirm the logic storing recent episodes is triggered after playback

---

## 💡 Additional Suggestions
- Add custom error handler middleware in Express to log and send 404s properly
- Set up a default `/api/monitoring/error` logger, even if just a stub:
```js
app.post("/api/monitoring/error", (req, res) => {
  console.log("Monitoring Log:", req.body);
  res.status(204).end();
});
```
- Add network error fallback UI in React to catch service worker failures

---

## ❗ Must Do Next (For Assistant)

- [ ] Implement `/api/anilist`, `/api/errors`, and `/api/monitoring/error` endpoints.
- [ ] Add Supabase insert logic for recently watched episodes.
- [ ] Update the meta tag in `public/index.html` or `_document.tsx`.
- [ ] Fix `logPerformance()` to avoid infinite loop triggers.
- [ ] Fix service worker navigation fallback.

---

Generated: 2025-06-21
