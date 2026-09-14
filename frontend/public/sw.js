/*
 * Service Worker der Mitarbeiterbörse.
 *
 * Ziel ist nicht Offline-Betrieb der Daten – freie Mitarbeiter müssen immer
 * aktuell sein –, sondern eine installierbare App-Hülle, die auch bei
 * schlechter Verbindung schnell startet.
 *
 *  - App-Shell (HTML/JS/CSS/Icons): stale-while-revalidate
 *  - Kartenkacheln: Cache mit Begrenzung
 *  - /api und /auth: NIE cachen, immer Netzwerk
 */

const VERSION = 'v4';
const SHELL_CACHE = `shell-${VERSION}`;
const TILE_CACHE = `tiles-${VERSION}`;
const MAX_TILES = 300;

const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (const key of keys.slice(0, keys.length - max)) await cache.delete(key);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Daten und Anmeldung niemals aus dem Cache bedienen.
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Kartenkacheln: erst Cache, sonst Netz (und dann ablegen).
  if (/tile\.openstreetmap\.org|basemaps\.cartocdn\.com/.test(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(TILE_CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      try {
        const res = await fetch(request);
        if (res.ok) {
          cache.put(request, res.clone());
          trimCache(TILE_CACHE, MAX_TILES);
        }
        return res;
      } catch {
        return hit || Response.error();
      }
    })());
    return;
  }

  // Navigationen: Netz zuerst, bei Ausfall die zwischengespeicherte Hülle.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Übrige gleichnamige Ressourcen: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const hit = await cache.match(request);
      const network = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => hit);
      return hit || network;
    })());
  }
});

/* ---------------------------------------------------------------------------
 * Push-Benachrichtigungen
 * Diese Handler laufen auch dann, wenn die App geschlossen ist – nur so
 * erreichen Freimeldungen die Einsatzleitung zuverlässig.
 * ------------------------------------------------------------------------- */

self.addEventListener('push', (event) => {
  let data = { title: 'Mithelferbörse', body: 'Neue Meldung', tag: 'mithelfer', url: '/dashboard' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      lang: 'de',
      renotify: true,
      requireInteraction: false,
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/dashboard';

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Ist die App schon offen? Dann dorthin wechseln statt neu zu öffnen.
    for (const client of clientList) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target).catch(() => {});
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
