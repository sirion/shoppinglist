import Shoppinglist from "./shoppinglist.js";

async function registerServiceWorker() {
	try {
		await navigator.serviceWorker.register("./js/sw/sw.js");
	} catch (ex) {
		console.error("Error registering service worker: " + ex.message);
	}
}

(async () => {
	await registerServiceWorker();
	const app = new Shoppinglist();
	app.render("list");
})();

