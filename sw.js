// Trip Pins service worker: keeps the app and viewed map tiles working offline.
const VERSION = 'trippins-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const CDN = /^(https:\/\/cdnjs\.cloudflare\.com|https:\/\/fonts\.(googleapis|gstatic)\.com)/;
const TILES = /tile\.openstreetmap\.org/;
const MAX_TILES = 400;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== VERSION && k !== 'tiles').map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page itself: try the network (for updates), fall back to the cached copy.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put('./', copy));
      return res;
    }).catch(() => caches.match('./', { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }

  // App files, Leaflet and fonts: cache first.
  if (url.origin === location.origin || CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Map tiles: cache the ones you've looked at, so the map still shows on a bad signal.
  if (TILES.test(url.host)) {
    e.respondWith(caches.open('tiles').then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          c.put(req, res.clone());
          c.keys().then(k => { if (k.length > MAX_TILES) k.slice(0, k.length - MAX_TILES).forEach(r => c.delete(r)); });
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })));
  }
  // Everything else (your Google Sheet) goes straight to the network.
});
