import dom from "./utils/domtools.js";
import Dialogs from "./dialogs.js";
import UI from "./ui.js";





class Shoppinglist {

	constructor() {
		this.longAction = false;
		this.apiPath = "/api";
		this.accessCode = undefined;
		this.data = null;

		this.lastRequestDone = Promise.resolve();
	}


	async render(id) {
		if (this.firstUse()) {
			const introduction = (await import("./introduction.js")).default;
			await introduction();
			this.firstUse(true);
		}

		(async () => {
			await this.verfifyCode();
			this.refreshData(true);
		})();

		(async () => {
			// Render as soon as possible
			await dom.documentReady();
			this.lists = new UI(document.querySelector("#" + id));
			this.lists.addEventListener("add", this.onAdd.bind(this));
			this.lists.addEventListener("remove", this.onRemove.bind(this));
			this.lists.addEventListener("change", this.onChange.bind(this));
			this.lists.addEventListener("activate", this.onSwitch.bind(this));
			this.lists.addEventListener("deactivate", this.onSwitch.bind(this));
			this.lists.addEventListener("refresh", this.onRefresh.bind(this));
		})();
	}


	connectWorker(worker) {
		this.worker = worker;
		this.worker.addEventListener("message", e => {
			if (e.data && e.data.msg === "refreshed") {
				this.refreshData(true);
			}
		});
	}

	async refreshData(update = false) {
		clearTimeout(this.dataLoadTimeout);
		this.dataLoadTimeout = setTimeout(async () => {
			this.dataLoaded = this.getAPI("lists", "main");
			if (update) {
				await this.dataLoaded;
				clearTimeout(this.updateTimeout);
				this.updateTimeout = setTimeout(async () => {
					this.update(true);
				}, 100);
			}
		}, 100);
	}

	firstUse(set = false) {
		if (set) {
			localStorage.setItem("introDone", true);
			return true;
		}
		return !localStorage.getItem("introDone");
	}

	async verfifyCode() {
		this.accessCode = localStorage.getItem("code");

		const matched = location.search.match(/[?&]code=([^&]*)/u);
		if (matched) {
			this.accessCode = matched[1];
		}

		while (!this.accessCode) {
			this.accessCode = await Dialogs.string("", "Zugriffscode:");
		}

		localStorage.setItem("code", this.accessCode);
	}

	async update(refresh = false) {
		if (!this.data || refresh) {
			this.data = await this.dataLoaded;
		}

		if (this.data.meta.source === "cache") {
			this.lists.cached = true;
		}

		this.lists.colors = this.data.colors;
		this.lists.active = this.data.active;
		this.lists.inactive = this.data.inactive;
	}


	async onAdd(event) {
		const entry = event.detail.entry;
		// const active = event.detail.active;
		await this.putAPI(entry, "lists", "main"); // TODO: additional argument active ? "active" : "inactive"
		this.refreshData(true);
	}

	async onRemove(event) {
		const entry = event.detail.entry;
		const active = event.detail.active;
		const entryNumber = event.detail.entryNumber;

		// await Dialogs.info("DELETE dry run.", "DEBUG");
		await this.deleteAPI(entry, "lists", "main", active ? "active" : "inactive", entryNumber);
		this.refreshData(true);

	}

	async onChange(event) {
		const entry = event.detail.entry;
		const active = event.detail.active;
		const entryNumber = event.detail.entryNumber;

		await this.putAPI(entry, "lists", "main", active ? "active" : "inactive", entryNumber);
		this.refreshData(true);
	}

	async onSwitch(event) {
		const entry = event.detail.entry;
		const active = event.detail.active;
		const entryNumber = event.detail.entryNumber;
		await this.postAPI(entry, "lists", "main", active ? "active" : "inactive", entryNumber);
	}

	async onRefresh(/* event */) {
		this.refreshData(true);
	}

	async getAPI(...parts) {
		return this.useAPI("GET", null, ...parts);
	}

	async postAPI(payload, ...parts) {
		return this.useAPI("POST", payload, ...parts);
	}

	async putAPI(payload, ...parts) {
		return this.useAPI("PUT", payload, ...parts);
	}

	async deleteAPI(payload, ...parts) {
		return this.useAPI("DELETE", payload, ...parts);
	}

	async useAPI(method, payload, ...parts) {
		await this.lastRequestDone;

		const fetched = fetch(this.apiPath + "/" + parts.join("/"), {
			method: method,
			headers: {
				"X-Access-Code": this.accessCode,
				"Content-Type": "application/json"
			},
			body: payload ? JSON.stringify(payload) : undefined
		});

		this.lastRequestDone = fetched.catch(() => {
			this.lists.offline = true;
			this.update();
		});

		const response = await fetched;

		if (response.headers.get("X-From-Cache") === "true") {
			this.lists.offline = true;
			// Retry later
			setTimeout(() => {
				this.refreshData(true);
			}, 60000);
		} else {
			this.lists.offline = false;
		}

		if (response.status === 204) {
			return true;
		}

		if (response.headers.get("Content-Type") !== "application/json") {
			throw new Error(await response.text());
		} else if (response.status >= 400) {
			try {
				const data = await response.json();
				if (data.code === "e07") {
					await Dialogs.info("Ungültiger Zugriffscode", "Fehler");
					localStorage.removeItem("code");
					location.reload();
				} else {
					await Dialogs.info(data.message, "Server Fehler");
				}
				return data;
			} catch (ex) {
				const text = await response.text();
				await Dialogs.info(text, "Unbekannter Fehler");
				return text;
			}
		}

		return response.json();
	}
}

export default Shoppinglist;
