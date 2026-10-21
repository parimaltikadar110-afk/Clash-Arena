// ClashX7 service worker: OneSignal push notifications + offline page.
// Place in the /public folder (served at https://clashx7.in/sw.js).

// Keep OneSignal push working (it must run inside this same worker)
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDKWorker.js');

const CACHE = 'clashx7-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.mode !== 'navigate') return;
  event.respondWith(
    fetch(req).catch(() => caches.match(OFFLINE_URL, { ignoreSearch: true }))
  );
});
