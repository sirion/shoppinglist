const cacheName = "v0.2.1";

const cacheURIs = [
	"/index.html",
	"js/main.js",
	"js/shoppinglist.js",
	"js/ui.js",
	"js/introduction.js",
	"js/dialogs.js",
	"js/dialog.js",
	"js/utils/domtools.js",
	"js/utils/filter.js",
	"css/main.css",
	"img/offline.svg",
	"font/Oxanium-Medium.ttf"
];


const cacheOpened = caches.open(cacheName);

function onActivate() {
	return caches.keys().then(keys => {
		return Promise.all(keys.map(key => caches.delete(key)));
	}).then(() => {
		return self.clients.claim();
	});
}

function onInstall(/* e */) {
	self.skipWaiting();

	return cacheOpened.then(cache => {
		return cache.addAll(cacheURIs);
	});
}

function updateCache(request) {
	console.log("[Service Worker] Caching resource " + request.url);
	return fetch(request).then(response => {
		const cacheResponse = response.clone();
		cacheOpened.then(cache => {
			cache.put(request, cacheResponse);
		});
		return response;
	});
}

async function fromCache(request) {
	const cache = await cacheOpened;
	return cache.match(request);
}

async function cachedRequest(request) {
	let response = await fromCache(request);
	if (!response) {
		response = updateCache(request);
	}
	return response;
}

async function cachedIfOffline(request) {
	const response = await fromCache(request);

	// If there is no cached data, update the cache
	if (!response) {
		return updateCache(request);
	}

	// Try getting a live version, fallback after timeout
	return new Promise(res => {
		const fallback = () => {
			const cacheHeaders = new Headers(response.headers);
			cacheHeaders.append("X-From-Cache", "true");
			res(new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: cacheHeaders
			}));
		};

		const fallbackTimeout = setTimeout(fallback, 3000);

		updateCache(request).then(freshResponse => {
			clearTimeout(fallbackTimeout);
			res(freshResponse);
		}).catch(() => {
			clearTimeout(fallbackTimeout);
			fallback();
		});
	});
}

self.addEventListener("install", e => {
	console.log("[Service Worker] Install");
	e.waitUntil(onInstall(e));
});

self.addEventListener("activate", e => {
	e.waitUntil(onActivate());
});

self.addEventListener("fetch", e => {
	const isAPI = e.request.url.startsWith(self.origin + "/api");
	if (!isAPI) {
		e.respondWith(cachedRequest(e.request));
	} else if (e.request.method === "GET") {
		e.respondWith(cachedIfOffline(e.request));
	}
});



// 	/**
// 	 * # Caching Strategy
// 	 *
// 	 * ## Static resources
// 	 *
// 	 * All static resources will be cached on first request.
// 	 * On update the cacheName must be changed to renew the cache.
// 	 *
// 	 * ## API Request
// 	 *
// 	 * ### GET
// 	 * - Serve Cache if not older than maxAPICacheAge seconds.
// 	 * - Refresh cache in background.
// 	 * - Notify client of changes via message
// 	 *
// 	 * ### POST, PUT, DELETE
// 	 * - Try directly
// 	 * - If offline, store and notify user
// 	 * - Try again repeatedly
// 	 * - Check if server data changed after last update and ask user if so.
// 	 *
// 	 */
// 	async loadFromCache(request, clientId) {
// 		if (request.url.indexOf("/api") === 0) {
// 			// API request
// 			if (request.method !== "GET") {
// 				// TODO: Cache Modifying Accesses
// 				return;
// 			}

// 			const cache = await cacheOpened;
// 			const response = await cache.match(request);
// 			if (response) {
// 				// Refresh in background (no await)
// 				this.updateAndMessage(request, clientId);
// 				return response;
// 			}
// 			return;
// 		}

// 		// Static URL request
// 		return this.cachedRequest(request);
// 	}

// 	async updateAndMessage(request, clientId) {
// 		await this.updateCache(request);
// 		await this.messageClient(clientId, "refreshed");
// 	}

// 	async messageClient(clientId, message) {
// 		const client = clientId ? await this.worker.clients.get(clientId) : undefined;
// 		if (client) {
// 			// Send a message to the client.
// 			client.postMessage({ msg: message });
// 		}
// 	}

