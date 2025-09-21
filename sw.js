// Service Worker per il Curricolo SSAS
// Migliora le prestazioni e fornisce funzionalità offline

const CACHE_NAME = 'ssas-curricolo-v1.2';
const urlsToCache = [
    '/',
    '/index_ottimizzato.html',
    '/styles.css',
    '/app.js',
    // Aggiungi altre risorse critiche
];

// Installazione del service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aperta');
                return cache.addAll(urlsToCache);
            })
    );
});

// Attivazione del service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminazione cache vecchia:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Intercettazione delle richieste di rete
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - restituisci la risposta dalla cache
                if (response) {
                    return response;
                }

                return fetch(event.request).then(response => {
                    // Controlla se abbiamo ricevuto una risposta valida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clona la risposta
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});