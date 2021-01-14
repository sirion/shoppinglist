import dom from "./utils/domtools.js";

class Shoppinglist {

	constructor() {
		this.apiPath = "/api";
	}

	async render(id) {
		await dom.documentReady();

		this.dom = document.querySelector("#" + id);

		const onAction = this.onAction.bind(this);

		this.activeList = dom.createElement("div", {
			class: "list active",
			touchstart: onAction,
			touchend: onAction,
			mousedown: onAction,
			mouseup: onAction
		});

		this.inactiveList = dom.createElement("div", {
			class: "list inactive",
			touchstart: onAction,
			touchend: onAction,
			mousedown: onAction,
			mouseup: onAction
		});

		this.controls = dom.createElement("div", {
			class: "controls",
		});


		this.dom.appendChild(this.controls);
		this.dom.appendChild(this.activeList);
		this.dom.appendChild(this.inactiveList);

		// this.startUpdateLoop();
		this.update();
	}

	async update() {
		this.data = await this.getAPI("lists", "main");

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


	onButtonClick(event) {
		debugger;

	}


	_longAction = false;
	async onAction(event) {
		let active = false, inactive = false;
		if (event.currentTarget === this.activeList) {
			active = true;
		} else if (event.currentTarget === this.inactiveList) {
			inactive = true;
		}

		if (!active && !inactive) {
			debugger;
			return;
		}

		const checkLongAction = () => {
			// LongTouch
			if (this._longAction) {
				debugger;
				this._ignoreNextEvent = true;

				if (active) {
					// TODO: Edit entry
				} else {
					// TODO: Delete entry
				}
			}
		};

		if (event.type === "touchstart" || event.type === "mousedown") {
			this._longAction = true;
			clearTimeout(this._logActionTimeout);
			this._logActionTimeout = setTimeout(checkLongAction, 1500);
			return;
		} else if (event.type === "touchend" || event.type === "mouseup") {
			this._longAction = false;
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
			debugger;
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
				"background-color": data.color
			},
			div: {
				textContent: data.category,
				"data-entry": i
			},
			"data-entry": i
		}));

		list.appendChild(dom.createElement("div", {
			class: "amountNum",
			textContent: data.amount.number,
			"data-entry": i
		}));

		list.appendChild(dom.createElement("div", {
			class: "amountUnit",
			textContent: data.amount.unit,
			"data-entry": i
		}));

		list.appendChild(dom.createElement("div", {
			class: "name",
			textContent: data.name,
			"data-entry": i
		}));
	}


	async getAPI(...parts) {
		const result = await fetch(this.apiPath + "/" + parts.join("/"));
		if (result.status === 204) {
			return true;
		}
		return await result.json();
	}

	async postAPI(payload, ...parts) {
		const result = await fetch(this.apiPath + "/" + parts.join("/"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});

		if (result.status === 204) {
			return true;
		}
		return await result.json();
	}

}

export default Shoppinglist;