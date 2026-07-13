// EasyMeta Service Worker - 离线缓存 (stale-while-revalidate)
const CACHE_NAME = 'easymeta-v1.3.0';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/stats.js',
  './js/plots.js',
  './js/storage.js',
  './js/app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Files that should always revalidate (JS/CSS may contain bug fixes)
const REVALIDATE_EXTS = ['.js', '.css', '.html'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(err) {
        console.warn('SW: 部分资源缓存失败', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);
  var shouldRevalidate = REVALIDATE_EXTS.some(function(ext) {
    return url.pathname.endsWith(ext);
  });

  if (shouldRevalidate) {
    // Stale-while-revalidate: serve from cache, fetch update in background
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          var fetchPromise = fetch(event.request).then(function(response) {
            if (response.ok) {
              cache.put(event.request, response.clone()).catch(function() {});
            }
            return response;
          }).catch(function() {
            return cached || caches.match('./index.html');
          });
          return cached || fetchPromise;
        });
      })
    );
  } else {
    // Cache-first for other assets (images, manifest, etc.)
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok && response.type === 'basic') {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone).catch(function() {});
            });
          }
          return response;
        }).catch(function() {
          return caches.match('./index.html');
        });
      })
    );
  }
});
