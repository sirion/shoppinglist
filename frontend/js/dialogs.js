import dom from "./utils/domtools.js";
import Dialog from "./dialog.js";

export default class Dialogs {
	static async info(str, title = "") {
		const text = dom.createElement("div", {
			textContent: str,
			style: {
				"text-align": "center"
			}
		});
		const dialog = Dialog.create(title, [text]);
		dialog.type = "info";
		dialog.showModal();
		await dialog.closed;
	}

	static async string(str, title = "", placeholder = "") {
		let dialog = null;
		const input = dom.createElement("input", {
			type: "text",
			style: {
				"min-width": "12em"
			},
			change: () => {
				dialog.ok();
			},
			placeholder: placeholder,
			value: str
		});
		dialog = Dialog.create(title, [input]);
		dialog.type = "ok";
		dialog.addEventListener("show", () => {
			input.focus();
		});
		dialog.showModal();
		await dialog.closed;

		return input.value;
	}


	static async entry(categories, units, entry = {}) {
		const newOption = async (message, e) => {
			const target = e.target;
			if (target.selectedOptions[0].value !== "<new>") {
				return;
			}
			const category = await Dialogs.string("", message);
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

		const newCategory = newOption.bind(null, "New Category:");
		const newUnit = newOption.bind(null, "New Unit:");

		const categoryLabel = dom.createElement("label", {
			textContent: "Category",
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
				value: "<new>",
				textContent: "<new>"
			}].concat(categories.map(e => { return { value: e, textContent: e, selected: entry.category === e }; }))
		});

		const numberLabel = dom.createElement("label", {
			textContent: "Number",
			for: "inputNumber",
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
			textContent: "Unit",
			for: "inputUnit",
		});
		const unit = dom.createElement("select", {
			id: "inputUnit",
			input: newUnit,
			option: [{
				value: "",
				textContent: "",
				selected: entry.unit === ""
			}, {
				value: "<new>",
				textContent: "<new>"
			}].concat(units.map(e => { return { value: e, textContent: e, selected: entry.unit === e }; }))
		});


		const nameLabel = dom.createElement("label", {
			textContent: "Name",
			for: "inputName",
			class: "mandatory"
		});
		const name = dom.createElement("input", {
			id: "inputName",
			value: entry.name
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
			const dialog = Dialog.create("Add new Entry", [ layout ]);
			dialog.type = "confirm";
			dialog.showModal();

			ok = await dialog.closed;

			if (!ok) {
				invalidEntry = false;
			} else if (!category.value || !name.value) {
				await Dialogs.info("Name and category must be filled", "Invalid Entry");
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
}
