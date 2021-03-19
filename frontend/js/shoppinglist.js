import dom from "./utils/domtools.js";
import Dialogs from "./dialogs.js";
import Dialog from "./dialog.js";
import UI from "./ui.js";





class Shoppinglist {

	constructor() {
		this.longAction = false;
		this.apiPath = "/api";
		this.accessCode = undefined;
		this.knownLists = [];

		this.lastRequestDone = Promise.resolve();
	}


	async render(id) {
		let codeRead;

		if (this.firstUse()) {
			const introduction = (await import("./introduction.js")).default;
			await introduction();
			this.firstUse(true);
		}

		(async () => {
			codeRead = this.verfifyCode();
			await codeRead;
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
			this.lists.addEventListener("switchList", this.onSwitchList.bind(this));
			this.lists.addEventListener("addList", this.onAddList.bind(this));
			this.lists.addEventListener("createList", this.onCreateList.bind(this));
			this.lists.addEventListener("removeList", this.onRemoveList.bind(this));
			this.lists.addEventListener("shareList", this.onShareList.bind(this));
			this.lists.addEventListener("unitChange", this.onUnitChange.bind(this));
			this.lists.addEventListener("categoryChange", this.onCategoryChange.bind(this));
			this.lists.addEventListener("feedback", this.onFeedback.bind(this));

			window.addEventListener("online", () => { this.lists.offline = false; });
			window.addEventListener("offline", () => { this.lists.offline = true; });

			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "visible") {
					this.refreshData(true);
				}
			});
		})();
	}

	connectWorker(worker) {
		navigator.serviceWorker.addEventListener("message", m => {
			if (m.data && m.data.msg === "refreshed") {
				this.refreshData(true);
			}
		});
		this.worker = worker;
	}

	async refreshData(update = false) {
		if (!this._loading) {
			this._loading = true;
			this.dataLoaded = this.getAPI("list");
		}

		const data = await this.dataLoaded;
		this._loading = false;
		if (update) {
			this.update();
		}
		return data;
	}

	firstUse(set = false) {
		if (set) {
			localStorage.setItem("introDone", true);
			return true;
		}
		return !localStorage.getItem("introDone");
	}

	async verfifyCode() {
		try {
			this.knownLists = JSON.parse(localStorage.getItem("knownLists")) ?? {};
		} catch (ex) {
			this.knownLists = {};
		}
		this.accessCode = localStorage.getItem("code");

		const matched = location.search.match(/[?&]code=([^&]*)/u);
		if (matched) {
			this.accessCode = matched[1];
		}

		let invalid = !this.accessCode;
		if (invalid) {
			let dialog;

			const layout = dom.createElement("div", {
				style: {
					"min-width": "50vw",
					"min-height": "2em",
					"display": "flex",
					"justify-content": "space-evenly"
				},
				button: [{
					class: "button",
					div: [{
						textContent: "➕"
					}, {
						textContent: "Hinzufügen"
					}],
					click: async () => {
						await this.onAddList();
						dialog.close();
					}
				},{
					class: "button",
					div: [{
						textContent: "🆕"
					}, {
						textContent: "Erstellen"
					}],
					click: async () => {
						await this.onCreateList();
						dialog.close();
					}
				}]
			});



			while (invalid) {
				dialog = Dialog.create("Einkaufsliste", [ layout ]);
				dialog.type = "none";
				dialog.blocklayerCloses = true;
				dialog.background = "#ccc";
				dialog.showModal();
				await dialog.closed;

				try {
					await this.getAPI("ping");
					this.refreshData(true);
					invalid = false;
				} catch (err) {
					if (err?.data?.code === "e07") {
						await Dialogs.info("Ungültiger Zugriffscode", "Fehler");
					} else {
						await Dialogs.info(err?.data?.message ?? err.message, "Server Fehler");
					}
				}

			}
		}

		localStorage.setItem("code", this.accessCode);
	}

	async update() {
		const data = await this.dataLoaded;

		this.knownLists[this.accessCode] = data.meta.name;
		this.lists.lists = this.knownLists;
		localStorage.setItem("code", this.accessCode);
		localStorage.setItem("knownLists", JSON.stringify(this.knownLists));

		if (data.meta.source === "cache") {
			this.lists.cached = true;
		}

		this.lists.savedCategories = data.categories;
		this.lists.savedUnits = data.units;
		this.lists.active = data.active;
		this.lists.inactive = data.inactive;
	}

	async onAdd(event) {
		const entry = event.detail.entry;
		const active = event.detail.active;
		try {
			await this.putAPI(entry, "list", active ? "active" : "inactive");
		} catch (err) {
			await Dialogs.info(err.data.details, err.data.message);
		}
		this.refreshData(true);
	}

	async onRemove(event) {
		const entry = event.detail.entry;
		const active = event.detail.active;
		const entryNumber = event.detail.entryNumber;

		// await Dialogs.info("DELETE dry run.", "DEBUG");
		try {
			await this.deleteAPI(entry, "list", active ? "active" : "inactive", entryNumber);
		} catch (err) {
			await Dialogs.info(err.data.details, err.data.message);
		}
		this.refreshData(true);

	}

	async onChange(event) {
		const entry = {
			old: event.detail.old,
			new: event.detail.new
		};
		const active = event.detail.active;
		const entryNumber = event.detail.entryNumber;

		try {
			await this.putAPI(entry, "list", active ? "active" : "inactive", entryNumber);
		} catch (err) {
			await Dialogs.info(err.data.details, err.data.message);
		}
		this.refreshData(true);
	}

	async onSwitch(event) {
		const entry = event.detail.entry;
		const active = event.detail.active;
		const entryNumber = event.detail.entryNumber;
		try {
			await this.postAPI(entry, "list", active ? "active" : "inactive", entryNumber);
		} catch (err) {
			await Dialogs.info(err.data.details, err.data.message);
		}
	}

	async onRefresh(/* event */) {
		this.refreshData(true);
	}

	async onSwitchList(event) {
		const code = event.detail.code;
		this.accessCode = code;
		this.refreshData(true);
	}

	async onAddList(/* event */) {
		// Keep this.knownLists, but reset this.accessCode
		const code = await Dialogs.string("", "Zugriffscode:", "", true);
		if (!code) {
			return;
		}

		const oldCode = this.accessCode;
		try {
			this.accessCode = code;
			await this.getAPI("ping");
			this.refreshData(true);
		} catch (err) {
			this.accessCode = oldCode;
			if (err.data.code === "e07") {
				await Dialogs.info("Ungültiger Zugriffscode", "Fehler");
			} else {
				await Dialogs.info(err.data.details, err.data.message);
			}
		}
	}

	async onCreateList() {
		const listTitle = await Dialogs.string("", "Neue Liste", "Meine Einkaufsliste", true);
		if (!listTitle) {
			return;
		}

		try {
			const response = await this.putAPI(listTitle, "create");
			if (response && response.listCode) {
				const oldCode = this.accessCode;
				this.accessCode = response.listCode;
				try {
					await this.getAPI("ping");
					Dialogs.info(
						`Der Zugriffscode für die neue Liste lautet:\n\n ${this.accessCode}`,
						"Liste erstellt"
					);
					this.refreshData(true);
				} catch (err) {
					this.accessCode = oldCode;
					await Dialogs.info(err.data.details, err.data.message);
				}

			} else {
				await Dialogs.info(response.message, "Server Fehler");
			}

		} catch (err) {
			await Dialogs.info(err.data?.message ?? err.message, "Server Fehler");
		}
	}

	async onShareList(event) {
		const code = event.detail.code;
		const title = event.detail.title;
		await Dialogs.share(code, title);
	}

	async onRemoveList(event) {
		const code = event.detail.code;
		const title = event.detail.title;
		const ok = await Dialogs.confirm(
			`Liste\n\n"${title}"\n(Zugriffscode: ${code})\n\nwirklich entfernen?`
		);
		if (ok) {
			delete this.knownLists[code];
			this.accessCode = Object.keys(this.knownLists)[0];

			localStorage.setItem("knownLists", JSON.stringify(this.knownLists));
			this.lists.lists = this.knownLists;
			this.refreshData(true);
		}
	}

	async onUnitChange(/* event */) {
		this.putAPI(this.lists.savedUnits, "list", "units");
	}

	async onCategoryChange(/* event */) {
		this.putAPI(this.lists.savedCategories, "list", "categories");
	}

	async onFeedback(event) {
		const message = event.detail.message;
		try {
			await this.putAPI(message, "feedback");
		} catch (err) {
			await Dialogs.info(err.data?.message ?? err.message, "Server Fehler");
		}
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

		if (payload && typeof payload !== "string") {
			payload = JSON.stringify(payload);
		}

		const fetched = fetch(this.apiPath + "/" + parts.join("/"), {
			method: method,
			headers: {
				"X-Access-Code": this.accessCode,
				"Content-Type": "application/json"
			},
			body: payload
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
			this.lists.currentList = this.accessCode;
		}

		if (response.status === 204) {
			return true;
		}

		if (response.headers.get("Content-Type") !== "application/json") {
			// Api responses that are not json are incorrect
			throw new Error(await response.text());
		} else if (response.status >= 400) {
			const err = new Error("API Fehler");
			err.data = await response.json();
			throw err;
		}

		return response.json();
	}
}

export default Shoppinglist;
