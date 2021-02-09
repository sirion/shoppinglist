
export default class Dialog extends HTMLElement {
	////////////////////////////////////////////// Static Private Methods /////////////////////////////////////////////

	////////////////////////////////////////////// Static Public Methods //////////////////////////////////////////////



	static create(title, content = []) {
		const dialog = new Dialog();
		dialog.title = title;
		dialog.append(...content);

		dialog.closed = new Promise((resolve /*, reject */) => {
			dialog.addEventListener("ok", () => {
				dialog.close();
				resolve(true);
			});
			dialog.addEventListener("cancel", () => {
				dialog.close();
				resolve(false);
			});
		});

		document.body.append(dialog);

		return dialog;
	}

	////////////////////////////////////////////// Static Private Methods /////////////////////////////////////////////

	//////////////////////////////////////////////////// Contructor ///////////////////////////////////////////////////

	constructor() {
		super();

		////////////////////////////////////////////// Private Properties //////////////////////////////////////////////

		this.closed = null;

		this._type = null;
		this._dom = {
			header: null,
			content: null,
			footer: null
		};

		this._initDom();
	}


	//////////////////////////////////////////////// Public Properties ////////////////////////////////////////////////

	get type() {
		return this._type;
	}

	set type(type) {
		if (type === this._type) {
			return;
		}
		switch (type) {
		case "confirm":
			this._dom.btnOk.style.display = "block";
			this._dom.btnOk.textContent = "Ok";

			this._dom.btnCancel.style.display = "block";
			this._dom.btnCancel.textContent = "Cancel";

			break;

		case "ok":
			this._dom.btnOk.style.display = "block";
			this._dom.btnOk.textContent = "Ok";

			this._dom.btnCancel.style.display = "none";
			this._dom.btnCancel.textContent = "";
			break;

		default:
			console.error("[Dialog] Invalid dialog type set.");
			// fall through
		case "info":
			this._dom.btnOk.style.display = "block";
			this._dom.btnOk.textContent = "Close";

			this._dom.btnCancel.style.display = "none";
			this._dom.btnCancel.textContent = "";
			break;
		}
	}


	get title() {
		return this._dom.header.textContent;
	}

	set title(title) {
		this._dom.header.textContent = title;
	}

	////////////////////////////////////////////////// Public Methods /////////////////////////////////////////////////

	append(...elements) {
		return this._dom.content.append(...elements);
	}

	ok(/* event */) {
		this.dispatchEvent(new CustomEvent("ok", {}));
	}

	cancel(/* event */) {
		this.dispatchEvent(new CustomEvent("cancel", {}));
	}

	show() {
		this._resizeToScreen();

		this.open = true;
		this.style.opacity = "1";
		this._dom.btnOk.focus();
		this.dispatchEvent(new CustomEvent("show", {}));
	}

	showModal() {
		this._resizeToScreen();

		const blocklayer = this._getBlockLayer();
		document.body.append(blocklayer);
		this.open = true;
		this.style.opacity = "1";
		this._dom.btnOk.focus();
		this.dispatchEvent(new CustomEvent("show", {}));
	}

	close() {
		if (this.parentElement === this._blockLayer) {
			this._blockLayer.parentElement.removeChild(this._blockLayer);
		} else if (this.parentElement) {
			this.parentElement.removeChild(this);
		}

		this.open = false;
		this.style.opacity = "0";
		this.dispatchEvent(new Event("close"));
	}

	///////////////////////////////////////////////// Private Methods /////////////////////////////////////////////////

	_resizeToScreen() {
		const widthRatio = document.body.clientWidth / this.clientWidth;
		if (widthRatio < 1) {
			this.style.transform = "translate(-50%, -50%) scale(" + (widthRatio * 0.9) + ")";
		}

	}

	_append(...elements) {
		return HTMLElement.prototype.append.apply(this, elements);
	}

	_initDom() {
		this.id = "dialog-" + Dialog._idCounter++;
		Object.assign(this.style, {
			"opacity": "0",
			"transition": "opacity ease 300ms",
			"position": "absolute",
			"top": "50%",
			"left": "50%",
			"transform": "translate(-50%, -50%)",
			"width": "auto",
			"height": "auto",
			"display": "grid",
			"grid-template-rows": "2rem auto 2rem",
			"grid-template-areas": '"h" "c" "f"',
			"background-color": "white",
			"padding": "0.5rem",
			"box-shadow": "3px 3px 6px #444"
		});

		this.classList.add("dialog");

		this._dom.header = document.createElement("div");
		Object.assign(this._dom.header.style, {
			"grid-area": "h",
			"height": "2rem",
			"text-align": "center",
			"line-height": "2rem",
			"font-size": "1.25rem"
		});
		this._dom.header.classList.add("title");

		this._dom.content = document.createElement("div");
		this._dom.content.style["grid-area"] = "c";
		Object.assign(this._dom.content.style, {
			"grid-area": "c"
		});
		this._dom.content.classList.add("content");

		this._dom.btnOk = document.createElement("button");
		this._dom.btnOk.addEventListener("click", this.ok.bind(this));

		this._dom.btnCancel = document.createElement("button");
		this._dom.btnCancel.addEventListener("click", this.cancel.bind(this));

		this._dom.footer = document.createElement("div");
		Object.assign(this._dom.footer.style, {
			"grid-area": "f",
			"display": "flex",
			"justify-content": "flex-end",
			"align-items": "center"
		});
		this._dom.footer.classList.add("footer");
		this._dom.footer.append(this._dom.btnOk, this._dom.btnCancel);

		this.type = "confirm";

		this._append(this._dom.header, this._dom.content, this._dom.footer);
	}

	_getBlockLayer() {
		if (!this._blockLayer) {
			this._blockLayer = document.createElement("div");
			Object.assign(this._blockLayer.style, {
				position: "absolute",
				top: 0, left: 0, bottom: 0, right: 0,
				"background-color": "rgba(66, 66, 66, 0.8)",
				"z-index": Dialog._idCounter // TODO: Better solution needed
			});
		}
		this._blockLayer.append(this);
		return this._blockLayer;
	}




}

//////////////////////////////////////////// Static Private Properties ////////////////////////////////////////////

Dialog._idCounter = 0;

customElements.define("mi-dialog", Dialog);
