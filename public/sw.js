// Cache de l'appli : la page, son code et les données fixes de la vitrine restent disponibles
// hors réseau. Les réponses des bases en ligne ne sont jamais mises en cache ici.
// Changer CACHE à chaque publication pour que les téléphones prennent la nouvelle version.
const CACHE = 'genotheque-v24';
const SHELL = ['./', './manifest.webmanifest', './icon.svg', './favicon.svg', './favicon.ico', './icon-192.png', './icon-512.png',
  './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './data/familles/index.json', './data/orpha/index.json', './data/chiffres.json'];

// Toujours depuis le réseau à l'installation (« reload ») : une page restée dans le cache HTTP
// pointerait vers des fichiers d'une construction précédente, qui n'existent plus.
const fresh = (u) => new Request(u, { cache: 'reload' });

// À l'installation : la page et les fichiers qu'elle charge (leurs noms changent à chaque construction,
// on les lit donc dans la page elle-même).
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL.map(fresh));
    const html = await (await cache.match('./')).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
    await cache.addAll(assets.map(fresh));
    await self.skipWaiting();
  })());
});

// L'adresse github.io est partagée avec les autres projets du compte : on n'efface que nos propres
// anciens caches (genotheque-*, et genes-* des premières versions).
const OURS = /^(genotheque|genes)-v\d+$/;
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => OURS.test(k) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réponse immédiate depuis le cache, mise à jour en arrière-plan.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const update = fetch(req).then(async (res) => {
    // Seules les réponses complètes et normales sont gardées (pas de 206, pas de redirection opaque).
    if (res.status === 200 && res.type === 'basic') {
      const cache = await caches.open(CACHE);
      await cache.put(req, res.clone());
    }
    return res;
  });
  // La mise à jour doit aller au bout même si la réponse est déjà partie depuis le cache.
  e.waitUntil(update.catch(() => {}));
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    // ignoreVary : le code est chargé avec un en-tête Origin que la copie en cache n'a pas,
    // et un serveur qui répond « Vary: Origin » empêcherait sinon toute correspondance hors ligne.
    const opts = { ignoreSearch: true, ignoreVary: true };
    const cached = await cache.match(req, opts) || (req.mode === 'navigate' ? await cache.match('./', opts) : undefined);
    return cached || update.catch(() => cached);
  }));
});
