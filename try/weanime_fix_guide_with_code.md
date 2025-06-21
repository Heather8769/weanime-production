
# Weanime.live Deployment Fix Guide + Code Snippets

This guide includes all console warnings/errors observed on deployment, how to fix them, and code snippets for implementation. It ends with an action-ready checklist for developers or AI assistants.

---

## ✅ 1. Meta Tag Warning

**Warning:**
```html
<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated
```

**Fix:**
Replace it with:
```html
<meta name="mobile-web-app-capable" content="yes">
```

---

## 🚫 2. API Endpoint 404 Fixes

### `/api/anilist` – Express Version
```js
// server.js or routes.js
app.post("/api/anilist", async (req, res) => {
  const query = req.body.query;
  try {
    // Example stub response
    res.status(200).json({ result: `Fetched data for ${query}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anilist data" });
  }
});
```

### `/api/errors` – Basic Logger Stub
```js
app.post("/api/errors", (req, res) => {
  console.error("Error reported:", req.body);
  res.status(204).end();
});
```

### `/api/monitoring/error` – Logging Endpoint
```js
app.post("/api/monitoring/error", (req, res) => {
  console.log("Monitoring log:", req.body);
  res.status(204).end();
});
```

---

## 📉 3. Performance Monitoring Loop

**Fix:**
Throttle or debounce custom metrics:
```ts
import throttle from 'lodash.throttle';

const sendMetrics = throttle((metrics) => {
  fetch('/api/monitoring/error', {
    method: 'POST',
    body: JSON.stringify(metrics),
    headers: { 'Content-Type': 'application/json' }
  });
}, 5000); // Limit to 1 request every 5 seconds
```

---

## 🕸️ 4. Service Worker Navigation Fix

### Update your `sw.js`:
```js
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').catch(() => fetch(event.request))
    );
  }
});
```

---

## 📺 5. Supabase: Recently Watched Episodes

### Saving a recently watched episode
```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function saveRecentlyWatched(userId, episodeId) {
  const { error } = await supabase.from('recent_episodes').insert([
    { user_id: userId, episode_id: episodeId, watched_at: new Date() }
  ]);
  if (error) console.error("Failed to save episode", error);
}
```

### Retrieving recently watched
```ts
async function fetchRecentEpisodes(userId) {
  const { data, error } = await supabase
    .from('recent_episodes')
    .select('*')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false });
  return { data, error };
}
```

---

## ❗ MUST DO CHECKLIST

### Backend
- [ ] Implement `/api/anilist`, `/api/errors`, and `/api/monitoring/error` routes
- [ ] Add error handling and console fallback logic

### Frontend
- [ ] Update `<meta name="mobile-web-app-capable">` tag
- [ ] Throttle metrics logger in `useEffect` or observer hooks
- [ ] Add offline fallback UI for network failures

### Service Worker
- [ ] Add navigation fallback logic for dynamic routes

### Supabase
- [ ] Implement logic to store and query recently watched episodes per `user_id`

---

Generated for deployment debugging and AI assistance continuity.
