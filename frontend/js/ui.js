import dom from "./utils/domtools.js";
import Dialogs from "./dialogs.js";
import Filter from "./utils/filter.js";


function sortByCategory(a, b) {
	if (a.category === b.category) {
		return 0;
	}
	return a.category > b.category ? 1 : -1;
}

export default class UI extends EventTarget {

	get active() {
		return this._active;
	}
	set active(active) {
		this._active = active.slice();
		this.queueUpdate();
	}

	get inactive() {
		return this._inactive;
	}
	set inactive(active) {
		this._inactive = active.slice();
		this.queueUpdate();
	}

	get colors() {
		return this._colors;
	}
	set colors(colors) {
		this._colors = colors ?? {};
	}

	get cached() {
		return this.dom.classList.contains("cached");
	}
	set cached(cached) {
		this.dom.classList.toggle("cached", cached);
	}

	get offline() {
		return this.dom.classList.contains("offline");
	}
	set offline(offline) {
		this.dom.classList.toggle("offline", offline);
	}

	constructor(element) {
		super();
		this.dom = element;
		this.dom.style.display = "none";

		this.useTouch = null;

		this._active = [];
		this._inactive = [];
		this.categories = [];
		this.units = [];
		this._colors = {};

		this._preventDefault = e => e.preventDefault();

		this.init();
	}

	async addEntry(entry, inactive = false) {
		const list = inactive ? this._inactive : this._active;

		list.push(entry);

		this.emit("add", {
			entry: entry,
			active: !inactive
		});

		return this.update();
	}

	async createEntry(inactive = false) {
		const entry = await Dialogs.entry(this.categories, this.units);
		if (entry) {
			await this.addEntry(entry, inactive);
			return true;
		}
		return false;
	}

	async changeEntry(entryNumber, inactive = false) {
		const list = inactive ? this._inactive : this._active;
		const changed = await Dialogs.entry(this.categories, this.units, list[entryNumber]);

		if (changed) {
			this._active.splice(entryNumber, 1, changed);
			await this.update();

			this.emit("change", {
				entry: changed,
				active: !inactive,
				entryNumber: entryNumber
			});
			return changed;
		}
		return false;
	}

	async removeEntry(entryNumber, inactive = false) {
		const list = inactive ? this._inactive : this._active;
		const removed = list.splice(entryNumber, 1)[0];
		await this.update();
		this.emit("remove", {
			entry: removed,
			active: !inactive,
			entryNumber: entryNumber
		});
		return removed;
	}

	async refresh() {
		this.emit("refresh");
	}

	emit(eventName, data) {
		this.dispatchEvent(new CustomEvent(eventName, {
			detail: data
		}));
	}

	init() {
		this.initZoom();

		Object.assign(this.dom.style, {
			display: "block",
			overflow: "hidden auto"
		});

		this.dom.addEventListener("contextmenu", this._preventDefault); // Prevent contextmenu on long press

		const onAction = this.onAction.bind(this);
		const createEntry = this.createEntry.bind(this, false);
		const zoomIn = this.zoom.bind(this, true);
		const zoomOut = this.zoom.bind(this, false);

		this.indicatorOffline = dom.createElement("div", {
			class: "indicatorOffline",
			click: () => {
				this.emit("refresh");
			}
		});


		this.activeList = dom.createElement("div", {
			class: "list active",
			touchstart: onAction,
			touchend: onAction,
			touchmove: onAction,
			mousedown: onAction,
			mouseup: onAction,
			mousemove: onAction
		});

		this.inactiveList = dom.createElement("div", {
			class: "list inactive",
			touchstart: onAction,
			touchend: onAction,
			touchmove: onAction,
			mousedown: onAction,
			mouseup: onAction,
			mousemove: onAction
		});

		this.controls = dom.createElement("div", {
			class: "controls",
			style: {
				display: "grid",
				"grid-template-areas": "'l1 l2 s r'",
				"grid-template-columns": "min-content min-content auto min-content"
			},
			svg: [{
				class: "button zoomIn",
				style: {
					"grid-area": "l1"
				},
				click: zoomIn,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"stroke-width": "2px",
				line: [{
					x1: "50", y1: "35", x2: "50", y2: "65"
				}, {
					x1: "35", y1: "50", x2: "65", y2: "50"
				}]
			}, {
				class: "button zoomOut",
				style: {
					"grid-area": "l2"
				},
				click: zoomOut,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"stroke-width": "2px",
				line: [{
					x1: "35", y1: "50", x2: "65", y2: "50"
				}]
			}, {
				class: "button add",
				style: {
					"grid-area": "r"
				},
				click: createEntry,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"stroke-width": "5px",
				line: [{
					x1: "50", y1: "15", x2: "50", y2: "85"
				}, {
					x1: "15", y1: "50", x2: "85", y2: "50"
				}]
			}]
		});

		dom.clearElement(this.dom);
		this.dom.append(
			this.controls,
			this.activeList,
			this.inactiveList,
			this.indicatorOffline
		);
	}

	release() {
		this.dom.removeEventListener("contextmenu", this._preventDefault);
		this.dom.style.display = "none";
		dom.clearElement(this.dom);
		this.dom = null;
	}

	queueUpdate() {
		clearTimeout(this.updateTimeout);
		this.updateTimeout = setTimeout(this.update.bind(this), 0);
	}

	async update() {
		this.dom.style.display = "block";

		this.categories = Filter.propertyUnique({
			start: this.categories,
			removeEmpty: true,
			property: "category"
		}, this._active, this._inactive);
		this.units = Filter.propertyUnique({
			start: this.units,
			removeEmpty: true,
			property: "unit"
		}, this._active, this._inactive);

		this._active.sort(sortByCategory);
		this._inactive.sort(sortByCategory);

		dom.clearElement(this.activeList);
		this._active.forEach(this.creatEntry.bind(this, "active", this.activeList));
		dom.clearElement(this.inactiveList);
		this._inactive.forEach(this.creatEntry.bind(this, "inactive", this.inactiveList));

		this.resizeCategoryTexts(); // No await - do resize asynchronously
	}

	creatEntry(classPrefix, list, data, i) {
		list.appendChild(dom.createElement("div", {
			class: classPrefix + "Entry",
			div: [{
				class: "category category-" + data.category,
				style: {
					"background-color": this.getCategoryColor(data.category)
				},
				div: {
					class: "categorytext",
					textContent: data.category,
					"data-entry": i
				},
				"data-entry": i
			}, {
				class: "amountNum",
				textContent: data.number,
				"data-entry": i
			}, {
				class: "amountUnit",
				textContent: data.unit,
				"data-entry": i
			}, {
				class: "name",
				textContent: data.name,
				"data-entry": i
			}],
			"data-entry": i
		}));
	}

	getCategoryColor(category) {
		if (!this._colors[category]) {
			const rgb = [ 0, 0, 0 ];
			const input = btoa(category);
			for (let i = 0; i < input.length; i++) {
				const n = i % 3;
				rgb[n] = ((rgb[n] << 5) - rgb[n]) + input.charCodeAt(i);
			}

			rgb[0] = rgb[0] % 256;
			rgb[1] = rgb[1] % 256;
			rgb[2] = rgb[2] % 256;
			this._colors[category] = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
		}
		return this._colors[category];
	}

	async resizeCategoryTexts() {
		// TODO: Can this be done directly after creation?
		const texts = this.dom.querySelectorAll(".categorytext");
		for (let i = 0; i < texts.length; i++) {
			const e = texts[i];
			const width = e.parentElement.clientWidth * 0.9;

			let size = 1;
			while(size > 0.25 && e.getBoundingClientRect().width > width) {
				size = size * 0.95;
				e.style["font-size"] = Math.round(size * 100) / 100 + "em";
				await Promise.resolve();
			}
		}
	}

	initZoom() {
		const size = localStorage.getItem("item-height");
		if (size) {
			document.documentElement.style.setProperty("--item-height", size + "px");
		}
	}

	zoom(increase = false) {
		const ds = window.getComputedStyle(document.documentElement);
		let size = parseFloat(ds.getPropertyValue("--item-height")) ?? 18;
		if (increase) {
			size = Math.round((size * 1.05) * 1000) / 1000;
		} else {
			size = Math.round((size / 1.05) * 1000) / 1000;
		}
		document.documentElement.style.setProperty("--item-height", size + "px");
		localStorage.setItem("item-height", size);
	}

	getCurrentEntryNumber(event) {
		let element = event.target;

		if (event.changedTouches) {
			const touch = event.changedTouches[0];
			element = document.elementFromPoint(touch.clientX, touch.clientY);
		}

		return element.dataset?.entry;
	}

	onAction(event) {
		if (this.offline) {
			// Ignore all actions when offline
			return;
		}

		const isTouchEvent = event.type.startsWith("touch");
		const isMoveEvent = event.type.endsWith("move");
		const isUpEvent = event.type.endsWith("up");

		if (this.useTouch === null) {
			this.useTouch = isTouchEvent;
		}

		if (this.useTouch && !isTouchEvent) {
			return;
		} else if (!this.useTouch && isTouchEvent) {
			return;
		} else if (!this.longAction && isMoveEvent) {
			return;
		} else if (!this.longAction && isUpEvent) {
			return;
		}


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


		const checkLongAction = async () => {
			if (this.longAction === false) {
				return;
			}

			const entryNumber = this.getCurrentEntryNumber(event);
			const sameList = this.longAction.active === active;
			const sameItem = sameList && (this.longAction.start === entryNumber);
			if (!sameItem) {
				return;
			}
			this.longAction = false;

			// LongTouch
			if (active) {
				// Edit entry
				this._ignoreNextUpEvent = false; // up-event fired on dialog or blocklayer
				await this.changeEntry(entryNumber, false);

			} else {
				// Delete entry
				this._ignoreNextUpEvent = true; // up-event fired on list
				await this.removeEntry(entryNumber, true);
			}
		};


		const entryNumber = this.getCurrentEntryNumber(event);
		if (event.type === "touchstart" || event.type === "mousedown") {
			if (entryNumber === undefined) {
				// Selection on margins
				return;
			}

			this.longAction = { active: active, start: entryNumber};
			this._ignoreNextUpEvent = false;
			clearTimeout(this._logActionTimeout);
			this._logActionTimeout = setTimeout(checkLongAction, 1000);
			return;
		} else if (event.type === "touchmove" || event.type === "mousemove") {

			const sameList = this.longAction?.active === active;
			const sameItem = sameList && (this.longAction.start === entryNumber);
			if (!sameItem) {
				clearTimeout(this._logActionTimeout);
				this.longAction = false;
			}
			return;
		} else if (event.type === "touchend" || event.type === "mouseup") {
			clearTimeout(this._logActionTimeout);

			const sameList = this.longAction?.active === active;
			const sameItem = sameList && (this.longAction.start === entryNumber);
			if (!sameItem) {
				// Refresh action
				this.longAction = false;
				this.refresh();
				return;
			}
			this.longAction = false;
		}

		if (this._ignoreNextUpEvent) {
			delete this._ignoreNextUpEvent;
			return;
		}


		const lists = active ? [ this._active, this._inactive ] : [ this._inactive, this._active ];
		const entry = lists[0].splice(entryNumber, 1)[0];
		lists[1].push(entry);
		this.update();

		this.emit(active ? "deactivate" : "activate", {
			entry: entry,
			active: active,
			entryNumber: entryNumber
		});

	}


}
