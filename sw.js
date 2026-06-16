const CACHE = 'bookstore-v11';
const ASSETS = ['.', 'index.html', 'stores.js', 'manifest.webmanifest', 'icon.svg', 'og.png'];

// 항상 최신을 우선해야 하는 파일 (마크업 + 서점 데이터)
function isFresh(url) {
  return url.origin === location.origin && (
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('stores.js')
  );
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (isFresh(url)) {
    // network-first: HTTP 캐시 우회하고 항상 최신, 실패 시에만 캐시 폴백
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // cache-first: 아이콘/이미지 등 잘 안 변하는 정적 자산
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return r;
        })
      )
    );
  }
});
