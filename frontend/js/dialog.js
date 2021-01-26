
// TODO: Extend native dialog once supported in Firefox and Chrome

export default class Dialog extends HTMLElement {
	////////////////////////////////////////////// Static Private Methods /////////////////////////////////////////////

	////////////////////////////////////////////// Static Public Methods //////////////////////////////////////////////

	static async confirm(title, content = []) {

		await new Promise((resolve /*, reject */) => {
			const dialog = new Dialog();
			dialog.title = title;

			dialog.append(...content);

			dialog.addEventListener("ok", () => {
				dialog.returnValue = true;
				dialog.close();
				resolve(true);
			});
			dialog.addEventListener("cancel", () => {
				dialog.returnValue = false;
				dialog.close();
				resolve(false);
			});

			document.body.append(dialog);
			dialog.show();
		});
	}

	////////////////////////////////////////////// Static Private Methods /////////////////////////////////////////////

	//////////////////////////////////////////////////// Contructor ///////////////////////////////////////////////////

	constructor() {
		super();

		//////////////////////////////////////////////// Private Properties ///////////////////////////////////////////////

		this._type = null;
		this._dom = {
			header: null,
			content: null,
			footer: null
		};

		this._enrichDialog();

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


	///////////////////////////////////////////////// Private Methods /////////////////////////////////////////////////

	_append() {
		return HTMLElement.prototype.append.apply(this, arguments);
	}

	_onOkClicked(/* event */) {
		this.dispatchEvent(new CustomEvent("ok", {}));
	}

	_onCancelClicked(/* event */) {
		this.dispatchEvent(new CustomEvent("cancel", {}));
	}


	_initDom() {
		this.id = "dialog-" + Dialog._idCounter++;
		Object.assign(this.style, {
			"display": "grid",
			"grid-template-rows": "2rem auto 2rem",
			"grid-template-areas": '"h" "c" "f"',
			"background-color": "white",
			"padding": "0.5rem",
			"box-shadow": "3px 3px 6px #444",
			"top": "50%",
			"transform": "translate(-50%, -50%)",
			"left": "50%"
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
		this._dom.btnOk.addEventListener("click", this._onOkClicked.bind(this));

		this._dom.btnCancel = document.createElement("button");
		this._dom.btnCancel.addEventListener("click", this._onCancelClicked.bind(this));

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

	_enrichDialog() {
		Object.assign(this.style, {
			position: "absolute",
			top: "auto",
			left: "50%",
			width: "auto",
			height: "auto",
			translate: "-50%"
		});

		let blockLayer;
		const getBlockLayer = () => {
			if (!blockLayer) {
				blockLayer = document.createElement("div");
				Object.assign(blockLayer.style, {
					position: "absolute",
					top: 0, left: 0, bottom: 0, right: 0,
					"z-index": Dialog._idCounter // TODO: Better solution needed
				});
			}
			blockLayer.append(this);
			return blockLayer;
		};

		this.show = () => {
			this.open = true;
		};
		this.showModal = () => {
			document.body.append(getBlockLayer());
			this.open = true;
		};
		this.close = () => {
			if (this.parentElement === blockLayer) {
				blockLayer.parentElement.removeChild(blockLayer);
			} else if (this.parentElement) {
				this.parentElement.removeChild(this);
			}

			this.open = false;
			this.dispatchEvent(new Event("close"));
		};
	}



}

//////////////////////////////////////////// Static Private Properties ////////////////////////////////////////////

Dialog._idCounter = 0;

customElements.define("mi-dialog", Dialog);
