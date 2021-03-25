import dom from "./utils/domtools.js";
import Dialogs from "./dialogs.js";
import Filter from "./utils/filter.js";
import Dialog from "./dialog.js";


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
	set inactive(inactive) {
		this._inactive = inactive.slice();
		this.queueUpdate();
	}

	get categories() {
		return this._savedCategories.concat(this.listCategories);
	}

	get savedCategories() {
		return this._savedCategories;
	}
	set savedCategories(categories) {
		this._savedCategories = categories ?? [];
	}

	get listCategories() {
		const categoryNames = {};
		this._savedCategories.forEach(c => {
			categoryNames[c.name] = true;
			if (c.default) {
				this.defaultCategory = c;
			}
		});

		return Filter.propertyUnique({
			removeEmpty: true,
			property: "category"
		}, this._active, this._inactive).filter(n => {
			return !categoryNames[n];
		}).map(n =>{
			return {
				name: n,
				color: this.createCategoryColor(n),
				default: false,
				list: true
			};
		});
	}


	get units() {
		return this._savedUnits.concat(this.listUnits);
	}

	get savedUnits() {
		return this._savedUnits;
	}
	set savedUnits(units) {
		this._savedUnits = units ?? [];
	}

	get listUnits() {
		const unitNames = {};
		this._savedUnits.forEach(u => {
			unitNames[u.name] = true;
			if (u.default) {
				this.defaultUnit = u;
			}
		});

		return Filter.propertyUnique({
			removeEmpty: true,
			property: "unit"
		}, this._active, this._inactive).filter(n => {
			return !unitNames[n];
		}).map(n =>{
			return { name: n, default: false, list: true };
		});
	}

	get lists() {
		return this._lists;
	}
	set lists(lists) {
		this._lists = Object.assign({}, lists);
		this.queueUpdate();
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
		this._savedCategories = [];
		this._savedUnits = [];
		this._lists = [];

		this.categoryColors = {};
		this.currentList = null;
		this.defaultUnit = null;
		this.defaultCategory = null;

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
		const entry = await Dialogs.entry(this.categories, this.units, {
			number: "1",
			unit: this.defaultUnit,
			category: this.defaultCategory
		});
		if (entry) {
			await this.addEntry(entry, inactive);
			return true;
		}
		return false;
	}

	async changeEntry(entryNumber, inactive = false) {
		const list = inactive ? this._inactive : this._active;
		const old = Object.assign({}, list[entryNumber]);
		const changed = await Dialogs.entry(this.categories, this.units, old);

		if (changed) {
			this._active.splice(entryNumber, 1, changed);
			await this.update();

			this.emit("change", {
				old: old,
				new: changed,
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
		// START - DEBUG: REMOVE ME
		// const showVersion = async () => {
		// 	const versioninfo = document.querySelector("versionInfo") ?? dom.createElement("div");
		// 	Object.assign(versioninfo.style, {
		// 		top: 0, right: 0, "background-color": "pink", position: "fixed"
		// 	});
		// 	const res = await fetch("sw.js");
		// 	const text = await res.text();
		// 	const regVersion = /"(.*?)"/;
		// 	const matched = regVersion.exec(text);
		// 	versioninfo.textContent = matched[1];

		// 	document.body.append(versioninfo);
		// };
		// showVersion();
		// END   - DEBUG: REMOVE ME

		this.initZoom();

		Object.assign(this.dom.style, {
			display: "block",
			overflow: "hidden auto"
		});

		this.dom.addEventListener("contextmenu", this._preventDefault); // Prevent contextmenu on long press
		this.dom.addEventListener("scroll", this.onScroll.bind(this));

		const onAction = this.onAction.bind(this);
		const createEntry = this.createEntry.bind(this, false);
		const zoomIn = this.zoom.bind(this, true);
		const zoomOut = this.zoom.bind(this, false);
		const showMenu = this.showMenu.bind(this);


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
				gridTemplateAreas: "'l1 l2 s1 m s3 r'",
				gridTemplateColumns: "min-content min-content auto min-content auto min-content",
				"background-color": "#555",
				"z-index": "1"
			},
			svg: [{
				class: "button zoomIn",
				style: {
					gridArea: "l1"
				},
				click: zoomIn,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"stroke-width": "5px",
				line: [{
					x1: "50", y1: "35", x2: "50", y2: "65"
				}, {
					x1: "35", y1: "50", x2: "65", y2: "50"
				}]
			}, {
				class: "button zoomOut",
				style: {
					gridArea: "l2"
				},
				click: zoomOut,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"stroke-width": "5px",
				line: [{
					x1: "35", y1: "50", x2: "65", y2: "50"
				}]
			}, {
				class: "button showMenu",
				style: {
					gridArea: "m"
				},
				click: showMenu,
				version: "1.1",
				viewBox: "0 0 100 100",
				preserveAspectRatio: "none",
				"stroke-width": "5px",
				line: [{
					x1: "20", y1: "30", x2: "80", y2: "30"
				}, {
					x1: "20", y1: "50", x2: "80", y2: "50"
				}, {
					x1: "20", y1: "70", x2: "80", y2: "70"
				}]
			}, {
				class: "button add",
				style: {
					gridArea: "r"
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

		this._active.sort(sortByCategory);
		this._inactive.sort(sortByCategory);

		this.categoryColors = {};
		this.categories.forEach(cat => {
			this.categoryColors[cat.name] = cat.color;
		});

		dom.clearElement(this.activeList);
		this._active.forEach(this.listEntry.bind(this, "active", this.activeList));
		dom.clearElement(this.inactiveList);
		this._inactive.forEach(this.listEntry.bind(this, "inactive", this.inactiveList));

		this.resizeVariableTexts(); // No await - do resize asynchronously
	}

	listEntry(classPrefix, list, data, i) {
		list.appendChild(dom.createElement("div", {
			class: classPrefix + "Entry",
			div: [{
				class: "category category-" + data.category,
				style: {
					"background-color": this.categoryColors[data.category]
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
				"data-entry": i,
				div: {
					class: "amountUnitText",
					"data-entry": i,
					textContent: data.unit
				}
			}, {
				class: "name",
				textContent: data.name,
				"data-entry": i
			}],
			"data-entry": i
		}));
	}

	createCategoryColor(category) {
		const rgb = [ 0, 0, 0 ];
		const input = btoa(category);
		for (let i = 0; i < input.length; i++) {
			const n = i % 3;
			rgb[n] = ((rgb[n] << 5) - rgb[n]) + input.charCodeAt(i);
		}

		let color = (
			Math.abs((rgb[0] % 256) * 256 * 256) +
			Math.abs((rgb[1] % 256) * 256) +
			Math.abs(rgb[2] % 256)
		).toString(16);

		while (color.length < 6) {
			color = "0" + color;
		}

		return "#" + color;
	}

	async resizeVariableTexts() {
		let texts;

		// Categories
		texts = this.dom.querySelectorAll(".categorytext");
		for (let i = 0; i < texts.length; i++) {
			const e = texts[i];
			const width = e.parentElement.clientWidth;

			const targetScale =  Math.round(width / e.scrollWidth * 95) / 100;
			if (targetScale < 1) {
				e.style["transform"] = `scale(${targetScale})`;
			}
		}

		// Units
		texts = this.dom.querySelectorAll(".amountUnitText");
		for (let i = 0; i < texts.length; i++) {
			const e = texts[i];
			if (e.textContent === "") {
				continue;
			}
			const width = e.parentElement.clientWidth;

			const targetScale =  Math.round(width / e.scrollWidth * 95) / 100;
			if (targetScale < 1) {
				e.style["transform"] = `scale(${targetScale})`;
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

	async sendFeedback() {
		const message = await Dialogs.input({
			title: "Fehler melden",
			style: {
				width: "80vw",
				height: "45vh"
			},
			singleline: false,
			cancelable: true
		});

		if (message) {
			this.emit("feedback", { message: message });
		}
	}

	async editCategories() {
		const categories = await Dialogs.categories(this.savedCategories, this.listCategories);
		if (categories) {
			this.savedCategories = categories;
			this.emit("categoryChange");
			this.update();
		}
	}

	async editUnits() {
		const savedUnits = await Dialogs.units(this.savedUnits, this.listUnits);
		if (savedUnits) {
			this.savedUnits = savedUnits;
			this.emit("unitChange");
		}
	}

	async showMenu() {
		let dialog; // eslint-disable-line

		const layout = dom.createElement("div", {
			class: "menu",
			style: {
				"display": "grid",
				"margin": "3vw",
				"gap": "1em",
				"min-width": "80vw",
				"grid-template-areas":
					"'a a' " +
					"'b1 b2' " +
					"'c c' " +
					"'d d' " +
					"'sep sep' " +
					"'e e' " +
					"'f f' " +
					"'sep2 sep2' " +
					"'z1 z2'",
				"grid-template-columns": "1fr 1fr",
				"grid-template-rows": "2em 2em 2em 2em 0.5em 2em 2em 0.5em 2em",
				"justify-items": "stretch",
				"align-items": "stretch"
			}
		});


		const listSelect = dom.createElement("select", {
			class: "selector",
			style: {
				"grid-area": "a"
			},
			change: e => {
				const code = e.target?.selectedOptions?.[0]?.value;
				if (code) {
					dialog.close();
					this.emit("switchList", { code: code });
				}
			},
			option: Object.entries(this.lists).map(e => {
				return {
					value: e[0],
					textContent: e[1],
					selected: e[0] === this.currentList
				};
			}),
			disabled: Object.keys(this.lists).length <= 1
		});

		const addButton = dom.createElement("button", {
			class: "button add",
			style: {
				"grid-area": "c"
			},
			div: [{
				textContent: "➕"
			}, {
				textContent: "Hinzufügen"
			}],
			click: () => {
				dialog.close();
				this.emit("addList");
			}
		});

		const createButton = dom.createElement("button", {
			class: "button create",
			style: {
				"grid-area": "d"
			},
			div: [{
				textContent: "🆕"
			}, {
				textContent: "Erstellen"
			}],
			click: () => {
				dialog.close();
				this.emit("createList");
			}
		});

		const shareButton = dom.createElement("button", {
			class: "button share",
			style: {
				"grid-area": "b1"
			},
			div: [{
				textContent: "📤"
			}, {
				textContent: "Teilen"
			}],
			click: () => {
				const code = listSelect?.selectedOptions?.[0]?.value;
				const title = listSelect?.selectedOptions?.[0]?.textContent;

				dialog.close();

				// navigator.share must be called during a user initiated event, so we have to do it here :-/
				const shareOptions = {
					title: `Shoppinglist - ${title}`,
					text: `Geteilte Einkaufsliste: " ${title}" \n\n(Zugriffscode: "${code}")`,
					url: `${location.protocol}//${location.host}${location.pathname}?code=${code}`
				};
				if (navigator.canShare && navigator.canShare(shareOptions)) {
					navigator.share(shareOptions);
				} else {
					this.emit("shareList", {
						code: code,
						title: title
					});
				}
			}
		});

		const removeButton = dom.createElement("button", {
			class: "button remove",
			style: {
				"grid-area": "b2"
			},
			div: [{
				textContent: "🗑️"
			}, {
				textContent: "Entfernen"
			}],
			click: () => {
				dialog.close();
				this.emit("removeList", {
					code: listSelect?.selectedOptions?.[0]?.value,
					title: listSelect?.selectedOptions?.[0]?.textContent
				});
			}
		});

		const separator = dom.createElement("hr", {
			style: {
				"grid-area": "sep",
				"align-self": "center",
				"height": "2px",
				"width": "80%"
			}
		});

		const categories = dom.createElement("button", {
			class: "button categories",
			style: {
				"grid-area": "e"
			},
			div: [{
				textContent: "🗃"
			}, {
				textContent: "Kategorien"
			}],
			click: this.editCategories.bind(this)
		});

		const units = dom.createElement("button", {
			class: "button units",
			style: {
				"grid-area": "f"
			},
			div: [{
				textContent: "⚖"
			}, {
				textContent: "Einheiten"
			}],
			click: this.editUnits.bind(this)
		});

		const separator2  = dom.createElement("hr", {
			style: {
				"grid-area": "sep2",
				"align-self": "center",
				"height": "2px",
				"width": "80%"
			}
		});


		const feedback = dom.createElement("button", {
			class: "button feedback",
			style: {
				"grid-area": "z1"
			},
			div: [{
				textContent: "😤"
			}, {
				textContent: "Feedback"
			}],
			click: this.sendFeedback.bind(this)
		});

		const about = dom.createElement("div", {
			textContent: "Über",
			click: async () => { dialog.close(); await Dialogs.about(); },
			style: {
				"grid-area": "z2",
				"display": "flex",
				"justify-content": "flex-end",
				"align-items": "flex-end",
				"box-shadow": "none",
				"font-size": "0.75em"
			}
		});


		layout.append(
			listSelect,
			shareButton, removeButton,
			addButton,
			createButton,
			separator,
			categories,
			units,
			separator2,
			feedback,
			about
		);


		dialog = Dialog.create(null, [ layout ]);
		dialog.type = "none";
		dialog.blocklayerCloses = true;
		dialog.background = "#ccc";
		dialog.showModal();
		await dialog.closed;
	}

	getCurrentEntryNumber(event) {
		let element = event.target;

		if (event.changedTouches) {
			const touch = event.changedTouches[0];
			element = document.elementFromPoint(touch.clientX, touch.clientY);
		}

		return element?.dataset?.entry;
	}

	onScroll() {
		clearTimeout(this._logActionTimeout);
		this.longAction = false;
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
		if (entryNumber === false) {
			clearTimeout(this._logActionTimeout);
			this.longAction = false;
			return;
		}
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

	_preventDefault(e) {
		e.preventDefault();
	}

}
