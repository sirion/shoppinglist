import Shoppinglist from "./shoppinglist.js";

async function registerServiceWorker() {
	try {
		const reg = await navigator.serviceWorker.register("/sw.js");
		const serviceWorker = reg.installing ?? reg.waiting ?? reg.active;
		if (serviceWorker) {
			serviceWorker.addEventListener("statechange", e => {
				console.error("[SW State] " + e.target.state);
			});

			serviceWorker.addEventListener("error", e => {
				console.error("[SW] Error:" +  e.message);
			});

			return serviceWorker;
		}

	} catch (ex) {
		console.error("Error registering service worker: " + ex.message);
		return null;
	}
}

(async () => {
	const sw = await registerServiceWorker();
	const app = new Shoppinglist();
	if (sw) {
		app.connectWorker(sw);
	}
	app.render("lists");
})();
