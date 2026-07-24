// Service worker do ZONA ZERO — cache versionado (bump a versão a cada deploy
// para invalidar tudo de uma vez; é isso que evita o clássico "não atualizou").
const CACHE = 'zona-zero-v1';

const ASSETS = [
  '.',
  './index.html',
  './css/style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/main.js',
  './src/config.js',
  './src/core/loop.js',
  './src/core/statemachine.js',
  './src/game/rng.js',
  './src/game/grid.js',
  './src/game/collide.js',
  './src/game/walls.js',
  './src/game/balls.js',
  './src/game/powerups.js',
  './src/game/player.js',
  './src/game/levels.js',
  './src/game/scoring.js',
  './src/game/game.js',
  './src/services/storage.js',
  './src/ui/viewport.js',
  './src/ui/input.js',
  './src/ui/touch.js',
  './src/ui/render.js',
  './src/ui/fx.js',
  './src/ui/audio.js',
  './src/ui/screens.js',
  './src/ui/strings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// cache-first para GETs da própria origem (jogo 100% offline após a 1ª visita)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        }),
    ),
  );
});
