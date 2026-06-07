// Bump CACHE_VERSION on each release that changes offline behaviour.
const CACHE_VERSION = '2';
const CACHE_NAME = `veriaudit-offline-v${CACHE_VERSION}`;

// Only cache lightweight PWA metadata — never cache the app shell or JS bundles.
const OFFLINE_ASSETS = ['/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isNextAsset(url) {
  return url.pathname.startsWith('/_next/');
}

function isNavigation(request) {
  return (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // API routes always go to the network (no SW caching).
  if (isApiRequest(url)) return;

  // App shell and Next.js bundles: network-first so new deploys are picked up immediately.
  if (isNavigation(event.request) || isNextAsset(url) || url.pathname === '/') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Manifest and other small static files: cache-first for offline install.
  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Offline and no cached response available');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return fetch(request);
}
