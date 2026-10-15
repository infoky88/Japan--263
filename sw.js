const CACHE = 'japan-money-v2';

const STATIC_ASSETS = [
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

/* INSTALL */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      // Cache icons + manifest
      await cache.addAll(STATIC_ASSETS);

      // Get the newest index.html during installation
      try {
        const response = await fetch('./index.html', {
          cache: 'reload'
        });

        if (response.ok) {
          await cache.put(
            './index.html',
            response.clone()
          );
        }
      } catch (err) {
        console.log('Index preload failed:', err);
      }
    })()
  );

  self.skipWaiting();
});


/* ACTIVATE */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});


/* FETCH */
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') {
    return;
  }

  /* 
     For pages/index.html:
     NETWORK FIRST.
     This means GitHub updates appear immediately when online.
     Cached copy is only used when offline.
  */
  if (event.request.mode === 'navigate') {

    event.respondWith(
      (async () => {

        try {

          const freshResponse =
            await fetch(
              event.request,
              {
                cache: 'no-store'
              }
            );


          if (freshResponse.ok) {

            const cache =
              await caches.open(CACHE);

            await cache.put(
              './index.html',
              freshResponse.clone()
            );

          }


          return freshResponse;

        }

        catch (error) {

          const cachedPage =
            await caches.match(
              './index.html'
            );

          if (cachedPage) {
            return cachedPage;
          }

          throw error;

        }

      })()
    );

    return;
  }


  /*
     Icons / manifest / other files:
     Cache first.
  */
  event.respondWith(
    caches.match(event.request)
      .then(cached => {

        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then(response => {

            if (
              !response ||
              !response.ok
            ) {
              return response;
            }

            const copy =
              response.clone();

            caches.open(CACHE)
              .then(cache => {
                cache.put(
                  event.request,
                  copy
                );
              });

            return response;

          });

      })
  );

});
