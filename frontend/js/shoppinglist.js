import dom from "./utils/domtools.js";
import Filter from "./utils/filter.js";
import Dialogs from "./dialogs.js";


const useTouch = !!(window.DocumentTouch && document instanceof window.DocumentTouch);

class Shoppinglist {

	constructor() {
		this.longAction = false;
		this.apiPath = "/api";
		this.accessCode = undefined;

	}

	async render(id) {
		await this.verfifyCode();
		const dataLoaded = this.getAPI("lists", "main");

		await dom.documentReady();
		const onAction = this.onAction.bind(this);
		const onAdd = this.onAdd.bind(this);

		this.dom = document.querySelector("#" + id);


		this.activeList = dom.createElement("div", {
			class: "list active",
			touchstart: useTouch ? onAction : undefined,
			touchend: useTouch ? onAction : undefined,
			mousedown: useTouch ? undefined : onAction,
			mouseup: useTouch ? undefined : onAction
		});

		this.inactiveList = dom.createElement("div", {
			class: "list inactive",
			touchstart: useTouch ? onAction : undefined,
			touchend: useTouch ? onAction : undefined,
			mousedown: useTouch ? undefined : onAction,
			mouseup: useTouch ? undefined : onAction
		});

		this.controls = dom.createElement("div", {
			class: "controls",
			svg: [{
				class: "add",
				click: onAdd,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				line: [{
					x1: "50", y1: "15", x2: "50", y2: "85"
				}, {
					x1: "15", y1: "50", x2: "85", y2: "50"
				}]
			}]
		});


		this.dom.appendChild(this.controls);
		this.dom.appendChild(this.activeList);
		this.dom.appendChild(this.inactiveList);


		this.update(await dataLoaded);
	}

	async verfifyCode() {
		this.accessCode = localStorage.getItem("code");

		const matched = location.search.match(/[?&]code=([^&]*)/u);
		if (matched) {
			this.accessCode = matched[1];
		}

		if (!this.accessCode) {
			this.accessCode = prompt("Please provide access code:");
		}

		localStorage.setItem("code", this.accessCode);
	}

	async update(data) {
		if (data.type === "error") {
			alert("Invalid Access Code");
			localStorage.removeItem("code");
			location.reload();
			return;
		}

		this.data = data;

		this.categories = Filter.propertyUnique({
			start: this.data.categories,
			removeEmpty: true,
			property: "category"
		}, this.data.active, this.data.inactive);
		this.units = Filter.propertyUnique({
			start: this.data.units,
			removeEmpty: true,
			property: "unit"
		}, this.data.active, this.data.inactive);

		this.colors = this.data.colors ?? {};

		dom.clearElement(this.activeList);
		this.data.active.forEach(this.creatEntry.bind(this, this.activeList));
		dom.clearElement(this.inactiveList);
		this.data.inactive.forEach(this.creatEntry.bind(this, this.inactiveList));
	}


	startUpdateLoop() {
		this.stopUpdateLoop();
		this._updateLoopInterval = window.setInterval(this.update.bind(this), 5000); // TODO: Update interval
		this.update();
	}

	stopUpdateLoop() {
		window.clearInterval(this._updateLoopInterval);
	}

	async onAdd(/* event */) {
		const entry = await Dialogs.entry(this.categories, this.units);
		if (entry) {
			await this.putAPI(entry, "lists", "main");
		}
		await this.update();
	}

	async onAction(event) {
		let active = false;
		let inactive = false;

		if (event.currentTarget === this.activeList) {
			active = true;
		} else if (event.currentTarget === this.inactiveList) {
			inactive = true;
		}

		if (!active && !inactive) {
			return;
		}


		const entryNumber = event?.target?.dataset?.entry;
		const checkLongAction = async () => {
			// LongTouch
			if (this.longAction) {
				this._ignoreNextEvent = true;

				if (active) {
					// Edit entry
					const entry = await Dialogs.entry(this.categories, this.units, this.data.active[entryNumber]);
					if (entry) {
						await this.putAPI(entry, "lists", "main", "active", entryNumber);
					}
					await this.update();
				} else {
					// Delete entry
					await this.deleteAPI(this.data.inactive[entryNumber], "lists", "main", "inactive", entryNumber);
					await this.update();
				}
			}
		};

		if (event.type === "touchstart" || event.type === "mousedown") {
			this.longAction = true;
			clearTimeout(this._logActionTimeout);
			this._logActionTimeout = setTimeout(checkLongAction, 1000);
			return;
		} else if (event.type === "touchend" || event.type === "mouseup") {
			this.longAction = false;
		}

		if (this._ignoreNextEvent) {
			delete this._ignoreNextEvent;
			return;
		}


		// Incase we touch between the fields, search for the nearest field in the line
		let element = event.target;
		if (event.target === event.currentTarget) {
			const x = event.touches ? event.touches[0].clientX : event.clientX;
			const y = event.touches ? event.touches[0].clientY : event.clientY;

			element = document.elementFromPoint(x + 10, y);
			if (!element || element === event.currentTarget || element === document.body) {
				element = document.elementFromPoint(x - 10, y);
			}
			if (element === event.currentTarget || element === document.body) {
				element = null; // Nothing found;
			}
		}

		if (element === null) {
			return;
		}


		const entryNum = element.dataset.entry;

		if (active) {
			// Deactivate
			await this.postAPI(this.data.active[entryNum], "lists", "main", "active", entryNum);
		} else {
			// Activate
			await this.postAPI(this.data.inactive[entryNum], "lists", "main", "inactive", entryNum);
		}

		await this.update();
	}


	creatEntry(list, data, i) {

		list.appendChild(dom.createElement("div", {
			class: "category category-" + data.category,
			style: {
				"background-color": this.getCategoryColor(data.category)
			},
			div: {
				textContent: data.category,
				"data-entry": i
			},
			"data-entry": i
		}));

		list.appendChild(dom.createElement("div", {
			class: "amountNum",
			textContent: data.number,
			"data-entry": i
		}));

		list.appendChild(dom.createElement("div", {
			class: "amountUnit",
			textContent: data.unit,
			"data-entry": i
		}));

		list.appendChild(dom.createElement("div", {
			class: "name",
			textContent: data.name,
			"data-entry": i
		}));
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
