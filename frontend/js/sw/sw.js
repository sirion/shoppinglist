const cacheName = "shoppinglist-v0.2";

// const cachedURIs = [];

async function loadFromCache(request) {
	if (request.url.indexOf("/api") === 0) {
		return fetch(request);
	}

	let response = await caches.match(request);
	if (!response) {
		console.log("[Service Worker] Caching resource " + request.url);
		response = await fetch(request);
		const cache = caches.open(cacheName);
		cache.put(request, response.clone());
	}
	return response;
}

async function clearOldCaches() {
	const cacheKeys = await caches.keys();
	for (const key of cacheKeys) {
		await caches.delete(key);
	}
}

self.addEventListener("install", e => {
	console.log("[Service Worker] Install");
	// const cacheReady = caches.open(cacheName).then(cache => {
	// 	return cache.addAll(cachedURIs);
	// });

	// e.waitUntil(cacheReady);
});

self.addEventListener("activate", e => {
	console.log("[Service Worker] Activate");
	e.waitUntil(clearOldCaches());
});


self.addEventListener("fetch", e => {
	e.respondWith(loadFromCache(e.request));
});

