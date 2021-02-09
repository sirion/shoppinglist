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

	static async entry(categories, units, entry = {}) {
		const newOption = (message, e) => {
			if (e.target.selectedOptions[0].value !== "<new>") {
				return;
			}
			const category = prompt(message);
			if (!category) {
				e.target.options.selectedIndex = 0;
			} else {
				const option = dom.createElement("option", {
					value: category,
					textContent: category
				});
				e.target.append(option);
				option.selected = true;
			}
		};

		const newCategory = newOption.bind(null, "New Category:");
		const newUnit = newOption.bind(null, "New Unit:");

		const category = dom.createElement("select", {
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
		const number = dom.createElement("input", {
			type: "number",
			style: {
				width: "4em"
			},
			value: entry.number
		});
		const unit = dom.createElement("select", {
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
		const name = dom.createElement("input", {
			value: entry.name
		});

		const table = dom.createElement("table", {
			tr: [{
				th: [
					"Category", "#", "", "Name"
				]
			}, {
				td: [
					category, number, unit, name
				]
			}]
		});

		const ok = await Dialog.confirm("Add new Entry", [table]);

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
