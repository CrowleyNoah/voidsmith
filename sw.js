/* Works offline. Bump VERSION whenever you change files so phones pick up the update. */
const VERSION = 'vs-v51';
const FILES = ['./', 'index.html', 'fonts.css', 'fonts/chakra-500.woff2', 'fonts/chakra-600.woff2', 'fonts/chakra-700.woff2', 'styles.css', 'theme.css', 'core.js', 'persist.js', 'cloud.js', 'ship.js', 'game.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'assets/bg/bg_profile.jpg', 'assets/comp/comp_hornet.png', 'assets/comp/comp_longbow.png', 'assets/comp/comp_mender.png', 'assets/comp/comp_aegis.png', 'assets/comp/comp_static.png', 'assets/comp/comp_surge.png', 'assets/icons/gear_array_t01_a.png', 'assets/icons/gear_array_t02_a.png', 'assets/icons/gear_array_t03_a.png', 'assets/icons/gear_bulkhead_t01_a.png', 'assets/icons/gear_bulkhead_t02_a.png', 'assets/icons/gear_bulkhead_t03_a.png', 'assets/icons/gear_cannon_t01_a.png', 'assets/icons/gear_cannon_t02_a.png', 'assets/icons/gear_cannon_t03_a.png', 'assets/icons/gear_coil_t01_a.png', 'assets/icons/gear_coil_t02_a.png', 'assets/icons/gear_coil_t03_a.png', 'assets/icons/gear_emitter_t01_a.png', 'assets/icons/gear_emitter_t02_a.png', 'assets/icons/gear_emitter_t03_a.png', 'assets/icons/gear_plating_t01_a.png', 'assets/icons/gear_plating_t02_a.png', 'assets/icons/gear_plating_t03_a.png', 'assets/icons/gear_pod_t01_a.png', 'assets/icons/gear_pod_t02_a.png', 'assets/icons/gear_pod_t03_a.png', 'assets/icons/gear_spar_t01_a.png', 'assets/icons/gear_spar_t02_a.png', 'assets/icons/gear_spar_t03_a.png', 'assets/ship/cannon_t01_a.png', 'assets/ship/cannon_t02_a.png', 'assets/ship/hull_t01.png', 'assets/ship/hull_t02.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // network first so updates show on the next open; cache only when offline
  e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
    .catch(() => caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }))));
});
