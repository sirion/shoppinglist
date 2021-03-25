import dom from "./utils/domtools.js";
import Dialog from "./dialog.js";

export default class Dialogs {
	static async info(str, title = "") {
		const text = dom.createElement("div", {
			textContent: str,
			style: {
				"text-align": "center",
				"white-space": "pre-line",
				"min-width": "max-content"
			}
		});
		const dialog = Dialog.create(title, [ text ]);
		dialog.type = "info";
		dialog.showModal();
		await dialog.closed;
	}

	static async confirm(str, title = "") {
		const text = dom.createElement("div", {
			textContent: str,
			style: {
				"text-align": "center",
				"white-space": "pre-line",
				"min-width": "max-content"
			}
		});
		const dialog = Dialog.create(title, [ text ]);
		dialog.type = "confirm";
		dialog.showModal();
		return dialog.closed;
	}

	static async string(str, title = "", placeholder = "", cancelable = false) {
		return Dialogs.input({
			title: title,
			value: str,
			placeholder: placeholder,
			cancelable: cancelable
		});
	}

	/**
	 * Show a single input element in a dialog.
	 *
	 * @param {map} options Options for the dialog
	 * @param {bool} [options.singleline=true] If set to true an input field is used if false a textarea
	 * @param {string} [options.title=] Title of the dialog. The dialog will not have a title area if this is empty
	 * @param {string} [options.type=text] Type attribute for the input element
	 * @param {string} [options.value=] The initial value of the element
	 * @param {string} [options.placeholder=] The placeholder hint for the empty element
	 * @param {int|undefined} [options.minlength=undefined] The minimum allowed length
	 * @param {int|undefined} [options.maxlength=undefined] The maximum allowed length
	 * @param {map} [options.style={ "min-width": "12em" }] Additional CSS for the input element
	 * @param {bool} [options.cancelable=false] Whether to show a cancel-button and clicking on the backgound cancels
	 * @returns {Promise} A promise resolving with the value of the input element or false if canceled.
	 */
	static async input(options = {}) {
		options = Object.assign({
			// Defaults
			title: "",

			type: "text",
			value: "",
			placeholder: "",
			minlength: undefined,
			maxlength: undefined,
			singleline: true,
			style: {
				"min-width": "12em"
			},
			cancelable: false
		}, options);



		let dialog = null;
		const input = dom.createElement(options.singleline ? "input" : "textarea", {
			type: options.singleline ? options.type : undefined,
			minlength: options.minlength,
			maxlength: options.maxlength,
			style: options.style,
			change: options.singleline ? () => { dialog.ok(); } : undefined,
			placeholder: options.placeholder,
			value: options.singleline ? options.value : undefined,
			textContent: options.singleline ? undefined : options.value
		});
		dialog = Dialog.create(options.title, [ input ]);
		dialog.blocklayerCloses = options.cancelable;
		dialog.type = options.cancelable ? "confirm" : "ok";
		dialog.addEventListener("show", () => {
			input.focus();
		});
		dialog.showModal();
		const ok = await dialog.closed;
		if (ok) {
			return input.value;
		}
		return false;
	}


	static async entry(categories, units, entry = {}) {
		let dialog;

		const newOption = async (message, maxlength, e) => {
			const target = e.target;
			if (target.selectedOptions[0].value !== "<neu>") {
				return;
			}
			const category = await Dialogs.input({
				title: message,
				maxlength: maxlength
			});
			if (!category) {
				target.options.selectedIndex = 0;
			} else {
				const option = dom.createElement("option", {
					value: category,
					textContent: category
				});
				target.append(option);
				option.selected = true;
			}
		};

		const newCategory = newOption.bind(null, "Neue Kategorie:", 29);
		const newUnit = newOption.bind(null, "Neue inheit:", 6);

		const categoryLabel = dom.createElement("label", {
			textContent: "Kategorie",
			for: "inputCategory",
			class: "mandatory"
		});
		const category = dom.createElement("select", {
			id: "inputCategory",
			input: newCategory,
			option: [{
				value: "",
				textContent: "",
				selected: entry.category === ""
			}, {
				value: "<neu>",
				textContent: "<neu>"
			}].concat(categories.map(c => {
				return {
					value: c.name,
					textContent: c.name,
					selected: entry.category === c.name
				};
			}))
		});

		const numberLabel = dom.createElement("label", {
			textContent: "Anzahl",
			for: "inputNumber"
		});
		const number = dom.createElement("input", {
			id: "inputNumber",
			type: "number",
			style: {
				width: "4em"
			},
			min: "0",
			max: "9999",
			step: "1",
			value: entry.number
		});

		const unitLabel = dom.createElement("label", {
			textContent: "Einheit",
			for: "inputUnit"
		});
		const unit = dom.createElement("select", {
			id: "inputUnit",
			input: newUnit,
			option: [{
				value: "",
				textContent: "",
				selected: entry.unit === ""
			}, {
				value: "<neu>",
				textContent: "<neu>"
			}].concat(units.map(u => {
				return {
					value: u.name,
					textContent: u.name,
					selected: entry.unit === u.name
				};
			}))
		});


		const nameLabel = dom.createElement("label", {
			textContent: "Name",
			for: "inputName",
			class: "mandatory"
		});
		const name = dom.createElement("input", {
			id: "inputName",
			value: entry.name,
			change: () => { dialog.ok(); }
		});

		const layout = dom.createElement("form", {
			class: "entyInputLayout",
			style: {
				display: "grid",
				gridTemplateColumns: "auto auto",
				gap: "0.5em"
			},
			children: [
				categoryLabel, category,
				numberLabel, number,
				unitLabel, unit,
				nameLabel, name
			]
		});

		let ok;
		let invalidEntry = true;
		while (invalidEntry) {
			dialog = Dialog.create("Neuer Eintrag", [ layout ]);
			dialog.type = "save";
			dialog.blocklayerCloses = true;
			dialog.showModal();
			name.focus();

			ok = await dialog.closed;

			if (!ok) {
				invalidEntry = false;
			} else if (!category.value || !name.value) {
				await Dialogs.info("Name und Kategorie müssen ausgefüllt sein", "Ungültige Eingabe");
			} else {
				invalidEntry = false;
			}
		}



		if (ok) {
			// Entry
			return {
				category: category.value,
				name:	name.value,
				number:	Number(number.value),
				unit:	unit.value
			};
		}

		// Canceled
		return false;
	}

	static async about() {
		const layout = dom.createElement("div", {
			style: {
				"text-align": "center"
			},
			p: [{
				textContent: "Geteilte Einkaufsliste"
			}, {
				textContent: "Einfache EInkaufsliste für mehrere gleichzeitige Benutzer"
			}],
			a: {
				href: "https://github.com/sirion/shoppinglist",
				target: "_blank",
				textContent: "https://github.com/sirion/shoppinglist"
			}
		});

		const dialog = Dialog.create("Shoppinglist", [ layout ]);
		dialog.type = "none";
		dialog.blocklayerCloses = true;
		dialog.showModal();
		await dialog.closed;
	}

	static async share(code, title) {
		const layout = dom.createElement("div", {
			style: {
				"text-align": "center"
			},
			p: [{
				textContent: "Teile die Liste"
			}, {
				textContent: `"${title}"`
			}, {
				textContent: `Zugriffscode: "${code}"`
			}],
			a: {
				href: `${location.protocol}//${location.host}${location.pathname}?code=${code}`,
				target: "_blank",
				textContent: `${location.protocol}//${location.host}${location.pathname}?code=${code}`
			}
		});

		const dialog = Dialog.create("Shoppinglist", [ layout ]);
		dialog.type = "none";
		dialog.blocklayerCloses = true;
		dialog.showModal();
		await dialog.closed;
	}




	static async units(savedUnits, listUnits) {
		savedUnits = savedUnits.slice(); // Do not manipulate the original
		let unitsChanged = false;
		let refreshRows, createUnitRow; // eslint-disable-line prefer-const

		const layout = dom.createElement("div", {
			style: {
				"grid-template-rows": "1em auto",
				"min-width": "80vw",
				"min-height": "50vh"
			}
		});

		const controls = dom.createElement("div", {
			style: {
				display: "flex",
				"justify-content": "flex-end",
				"margin-bottom": "0.5em"
			},
			button: {
				textContent: "+",
				click: async () => {
					const unit = await Dialogs.input({
						title: "Neue Einheit:",
						maxlength: 6,
						cancelable: true
					});
					if (unit) {
						savedUnits.push({
							name: unit,
							default: false
						});
						refreshRows();
						unitsChanged = true;
					}
				}
			}
		});
		const table = dom.createElement("table", {
			style: {
				width: "100%",
				"border-collapse": "collapse",
				"border-spacing": 0
			}
		});

		refreshRows = () => {
			const head = dom.createElement("thead", {
				tr: {
					th: [{
						textContent: "❤️",
						style: {
							width: "32px",
							"margin-bottom": "0.5em",
							"font-size": "0.8em"
						}
					}, {
						textContent: "Name",
						style: {
							"text-align": "left",
							"font-size": "0.8em"
						}
					}, {
						textContent: "⇅",
						colspan: "2",
						style: {
							width: "2.5em",
							"text-align": "center"
						}
					}, {
						textContent: "±",
						style: {
							width: "32px",
							"font-size": "0.8em"
						}
					}]
				}
			});
			const savedRows = dom.createElement("tbody", {});
			const listRows = dom.createElement("tbody", {
				th: {
					colspan: "3",
					textContent: "In Liste:",
					style: {
						"font-size": "0.8em",
						"padding-top": "0.75em"

					}
				}
			});

			const savedUnitNames = {};
			savedUnits.forEach(unit => {
				savedUnitNames[unit.name] = true;
				savedRows.append(createUnitRow(unit));
			});

			listUnits.forEach(unit => {
				if (!savedUnitNames[unit.name]) {
					listRows.append(createUnitRow(unit));
				}
			});

			dom.clearElement(table);
			table.append(head, savedRows, listRows);
		};

		const saveUnit = e => {
			savedUnits.push({
				name: e.target.dataset.name,
				default: false
			});
			refreshRows();
			unitsChanged = true;
		};

		const removeUnit = e => {
			for (let i = 0; i < savedUnits.length; i++) {
				if (savedUnits[i].name === e.target.dataset.name) {
					savedUnits.splice(i, 1);
					break;
				}
			}
			refreshRows();
			unitsChanged = true;
		};

		createUnitRow = unit => {
			return dom.createElement("tr", {
				style: {
					"background-color": unit.list ? "transparent" : "#fff6"
				},
				td: [{
					style: {
						"text-align": "center"
					},
					mouseup: e => {
						const target = e.currentTarget.firstChild;

						// The "mouseup" event is fired before "click", "change" and "input" and e.target.checked is
						// still set to the value the user observed when interacting. When "click" is fired, the
						// value already changed, so we can use "mouseup" to check and "click" to change/reset.
						// "input" and "change" are both only fired when selecting a previously not selected option.
						// "mouseup" and "click" are also fired when using a touch device.
						if (target.checked) {
							// When interacting with an already checked item, remove the selection
							target._removeChecked = true;
						}
					},
					click: e => {
						const target = e.currentTarget.firstChild;

						if (target._removeChecked) {
							delete target._removeChecked;
							target.checked = false;
						} else {
							for (let i = 0; i < savedUnits.length; i++) {
								savedUnits[i].default = savedUnits[i].name === target.dataset.name;
							}
						}
						unitsChanged = true;
					},
					input: [{
						type: "radio",
						name: "defaultUnit",
						checked: unit.default,
						disabled: unit.list,
						dataset: unit
					}]
				},{
					textContent: unit.name,
					style: {
						color: unit.list ? "#777777" : "#000000"
					}
				}, {
					textContent: unit.list ? "" : "↑",
					style: {
						"text-align": "center"
					},
					dataset: unit,
					click: unit.list ? undefined : e => {
						for (let i = 0; i < savedUnits.length; i++) {
							if (i > 0 && e.target.dataset.name === savedUnits[i].name) {
								const temp = savedUnits[i - 1];
								savedUnits[i - 1] = savedUnits[i];
								savedUnits[i] = temp;
								break;
							}
						}
						refreshRows();
					}
				}, {
					textContent: unit.list ? "" : "↓",
					style: {
						"text-align": "center"
					},
					dataset: unit,
					click: unit.list ? undefined : e => {
						for (let i = 0; i < savedUnits.length - 1; i++) {
							if (e.target.dataset.name === savedUnits[i].name) {
								const temp = savedUnits[i + 1];
								savedUnits[i + 1] = savedUnits[i];
								savedUnits[i] = temp;
								break;
							}
						}
						refreshRows();
					}
				}, {
					textContent: unit.list ? "➕" : "➖",
					click: unit.list ? saveUnit : removeUnit,
					dataset: unit
				}]
			});
		};




		refreshRows();

		layout.append(controls, table);

		const dialog = Dialog.create("Meine Einheiten", [ layout ]);
		dialog.type = "none";
		dialog.blocklayerCloses = true;
		dialog.background = "#ccc";
		dialog.showModal();
		await dialog.closed;

		if (unitsChanged) {
			return savedUnits;
		}
		return false;
	}

	static async categories(savedCategories, listCategories) {
		// TODO: This is basically the same as units, with the color added. They should share code.

		savedCategories = savedCategories.slice(); // Do not manipulate the original
		let categoriesChanged = false;
		let refreshRows, createCategoryRow; // eslint-disable-line prefer-const

		const layout = dom.createElement("div", {
			style: {
				"grid-template-rows": "1em auto",
				"min-width": "80vw",
				"min-height": "50vh"
			}
		});

		const controls = dom.createElement("div", {
			style: {
				display: "flex",
				"justify-content": "flex-end",
				"margin-bottom": "0.5em"
			},
			button: {
				textContent: "+",
				click: async () => {
					const category = await Dialogs.input({
						title: "Neue Kategorie:",
						maxlength: 16,
						cancelable: true
					});
					if (category) {
						savedCategories.push({
							name: category,
							color: "#000",
							default: false
						});
						refreshRows();
						categoriesChanged = true;
					}
				}
			}
		});
		const table = dom.createElement("table", {
			style: {
				width: "100%",
				"border-collapse": "collapse",
				"border-spacing": 0
			}
		});

		refreshRows = () => {
			const head = dom.createElement("thead", {
				tr: {
					th: [{
						textContent: "❤️",
						style: {
							width: "32px",
							"margin-bottom": "0.5em",
							"font-size": "0.8em"
						}
					}, {
						textContent: "Farbe",
						style: {
							"font-size": "0.8em"
						}
					}, {
						textContent: "Name",
						style: {
							"text-align": "left",
							"font-size": "0.8em"
						}
					}, {
						textContent: "±",
						style: {
							width: "32px",
							"font-size": "0.8em"
						}
					}]
				}
			});
			const savedRows = dom.createElement("tbody", {});
			const listRows = dom.createElement("tbody", {
				th: {
					colspan: "4",
					textContent: "In Liste:",
					style: {
						"font-size": "0.8em",
						"padding-top": "0.75em"

					}
				}
			});

			const savedCategoryNames = {};
			savedCategories.forEach(category => {
				savedCategoryNames[category.name] = true;
				savedRows.append(createCategoryRow(category));
			});

			listCategories.forEach(category => {
				if (!savedCategoryNames[category.name]) {
					listRows.append(createCategoryRow(category));
				}
			});

			dom.clearElement(table);
			table.append(head, savedRows, listRows);
		};

		const saveCategory = e => {
			savedCategories.push({
				name: e.target.dataset.name,
				color: e.target.dataset.color ?? "#000",
				default: false
			});
			refreshRows();
			categoriesChanged = true;
		};

		const removeCategory = e => {
			for (let i = 0; i < savedCategories.length; i++) {
				if (savedCategories[i].name === e.target.dataset.name) {
					savedCategories.splice(i, 1);
					break;
				}
			}
			refreshRows();
			categoriesChanged = true;
		};

		createCategoryRow = category => {
			const input = dom.createElement("input", {
				type: "color",
				disabled: !!category.list,
				// value: category.color, // Cannot use this with Safari on iOS. Why?
				input: e => {
					category.color = e.target.value;
					categoriesChanged = true;
				}
			});
			// Have to do this with Safari on iOS. Does not work when using setAttribute("input", category.color)...
			input.value = category.color;

			return dom.createElement("tr", {
				style: {
					"background-color": category.list ? "transparent" : "#fff6"
				},
				td: [{
					style: {
						"text-align": "center"
					},
					mouseup: e => {
						const target = e.currentTarget.firstChild;

						// The "mouseup" event is fired before "click", "change" and "input" and e.target.checked is
						// still set to the value the user observed when interacting. When "click" is fired, the
						// value already changed, so we can use "mouseup" to check and "click" to change/reset.
						// "input" and "change" are both only fired when selecting a previously not selected option.
						// "mouseup" and "click" are also fired when using a touch device.
						if (target.checked) {
							// When interacting with an already checked item, remove the selection
							target._removeChecked = true;
						}
					},
					click: e => {
						const target = e.currentTarget.firstChild;

						if (target._removeChecked) {
							delete target._removeChecked;
							target.checked = false;
						} else {
							for (let i = 0; i < savedCategories.length; i++) {
								savedCategories[i].default = savedCategories[i].name === target.dataset.name;
							}
						}
						categoriesChanged = true;
					},
					input: [{
						type: "radio",
						name: "defaultCategory",
						checked: category.default,
						disabled: category.list,
						dataset: category
					}]
				}, {
					input: input
				}, {
					textContent: category.name,
					style: {
						color: category.list ? "#777777" : "#000000"
					}
				}, {
					textContent: category.list ? "➕" : "➖",
					click: category.list ? saveCategory : removeCategory,
					dataset: category
				}]
			});
		};




		refreshRows();

		layout.append(controls, table);

		const dialog = Dialog.create("Meine Einheiten", [ layout ]);
		dialog.type = "none";
		dialog.blocklayerCloses = true;
		dialog.background = "#ccc";
		dialog.showModal();
		await dialog.closed;

		if (categoriesChanged) {
			return savedCategories;
		}
		return false;
	}


}
