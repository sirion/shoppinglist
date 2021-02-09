import dom from "./utils/domtools.js";
import UI from "./ui.js";
import Dialogs from "./dialogs.js";


let _skipIntro;
const introSkipped = new Promise(res => {
	_skipIntro = res;
});

function skipIntro() {
	introSkipped.skipped = true;
	_skipIntro();
}


/// DOM creation shortcuts

function message(text, standalone = false) {
	const el = dom.createElement("div", {
		style: {
			display: "block",
			transition: "opacity 500ms ease",
			background: "white",
			boxShadow: "#333 0px 0px 5px",
			textAlign: "center",
			padding: "0.5em",
			width: "75%",
			fontSize: "20px",
			whiteSpace: "pre-line",
			userSelect: "none"
		},
		textContent: text
	});
	if (standalone) {
		el.style.position = "fixed";
		el.style.left = "50%";
		el.style.transform = "translate(-50%, 0)";
		el.style.bottom = "10vh";
	}
	return el;
}

function title(text) {
	return dom.createElement("div", {
		style: {
			display: "block",
			transition: "opacity 500ms ease",
			background: "white",
			boxShadow: "#333 0px 0px 5px",
			textAlign: "center",
			padding: "0.5em",
			fontSize: "30px",
			userSelect: "none"
		},
		textContent: text
	});
}

function link(text, callback) {
	return dom.createElement("a", {
		style: {
			display: "inline-block",
			transition: "opacity 500ms ease",
			background: "#fff9",
			boxShadow: "#333 0px 0px 5px",
			textAlign: "center",
			padding: "0.5em",
			fontSize: "18px",
			userSelect: "none",
			textDecoration: "underline"

		},
		textContent: text,
		click: callback
	});
}

/// Helper functions

async function sleep(ms = 0) {
	return new Promise(res => { setTimeout(res, ms); });
}

async function nextFrame() {
	return new Promise(res => {
		setTimeout(() => {
			requestAnimationFrame(res);
		}, 0);
	});
}

async function nextEvent(event = "click", element = document) {
	return new Promise(res => {
		const done = () => {
			element.removeEventListener(event, done);
			res();
		};
		element.addEventListener(event, done);
	});
}

async function nextClick(element = document) {
	return nextEvent("click", element);
}

async function showElement(element) {
	element.style.transition = "opacity 500ms ease";
	element.style.opacity = "0";
	document.body.append(element);

	await nextFrame();

	return new Promise(res => {
		let timeout;
		const done = () => {
			clearTimeout(timeout);
			element.removeEventListener("transitionend", done);
			res();
		};
		timeout = setTimeout(done, 600); // Fallback
		element.addEventListener("transitionend", done);
		element.style.opacity = "1";
	});
}

async function hideElement(element) {
	element.style.transition = "opacity 500ms ease";
	element.style.opacity = "1";

	await nextFrame();

	return new Promise(res => {
		let timeout;
		const done = () => {
			clearTimeout(timeout);
			element.removeEventListener("transitionend", done);
			if (element.parentElement) {
				element.parentElement.removeChild(element);
			}
			res();
		};
		timeout = setTimeout(done, 600); // Fallback
		element.addEventListener("transitionend", done);
		element.style.opacity = "0";
	});
}

function highlightBox(element) {
	const rect = element.getBoundingClientRect();
	return dom.createElement("div", {
		style: {
			display: "block",
			position: "fixed",
			border: "3px dashed red",
			left: Math.round(rect.x + 2) + "px",
			top: Math.round(rect.y + 2) + "px",
			width: Math.round(rect.width - 4) + "px",
			height: Math.round(rect.height - 4) + "px"
		}
	});
}



const exampleLists = {
	active: [{
		name: "Toilettenpapier",
		number: "100",
		unit: "R",
		category: "Pandemie"
	}, {
		name: "Mehl",
		number: "1",
		unit: "kg",
		category: "Backen"
	}, {
		name: "Zucker",
		number: "1",
		unit: "kg",
		category: "Backen"
	}, {
		name: "Salz",
		number: "100",
		unit: "g",
		category: "Backen"
	}],
	inactive: [{
		name: "Karotten",
		number: "500",
		unit: "g",
		category: "Gemüse"
	}, {
		name: "Schokolade",
		number: "200",
		unit: "g",
		category: "Süßigkeiten"
	}, {
		name: "Energy-Drink",
		number: "50",
		unit: "l",
		category: "Getränke"
	}]
};



/// Steps

const layoutVertical = dom.createElement("div", {
	style: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "space-around",
		alignItems: "center",

		position: "fixed",
		top: "0",
		left: "0",
		bottom: "0",
		right: "0",

		transition: "opacity 500ms ease"
	}
});

function getList(clear = false) {
	if (clear && getList._list) {
		getList._list.release();
		delete getList._list;
		return null;
	} else if (!getList._list) {
		getList._list = new UI(document.querySelector("#lists"));
	}
	return getList._list;
}

async function welcome() {

	const element = layoutVertical.cloneNode();

	element.append(
		title("Willkommen in der Einkaufsliste."),
		message("Jetzt kommt eine kurze Erklärung wie die App funktioniert."),
		message("...tippe damit es weiter geht..."),
		link("...oder überspringen...", skipIntro)
	);

	await showElement(element);
	await nextClick();
	await hideElement(element);
}


async function emptyList() {
	let el;

	const layout = layoutVertical.cloneNode();
	showElement(layout);


	const list = getList();
	await nextFrame();

	el = message(
		"Mit den Knöpfen auf der linken Seite kann man die Größe der Einträge verändern..."
	);

	const box1 = highlightBox(list.dom.querySelector(".button.zoomIn"));
	const box2 = highlightBox(list.dom.querySelector(".button.zoomOut"));

	layout.append(el, box1, box2);
	await showElement(layout);
	await nextClick();
	await hideElement(layout);
	layout.removeChild(el);
	layout.removeChild(box1);
	layout.removeChild(box2);

	el = message(
		"Mit dem Knopf auf der rechten Seite kann man einen neuen Eintrag hinzufügen..."
	);

	const box3 = highlightBox(list.dom.querySelector(".button.add"));
	layout.append(el, box3);
	await showElement(layout);
	await nextClick();
	await hideElement(layout);
	layout.removeChild(el);
	layout.removeChild(box3);


	await hideElement(layout);
}

async function simpleList() {
	let el, box;

	const layout = layoutVertical.cloneNode();
	showElement(layout);


	el = message(
		"Hier ist eine Beispiel-Liste..."
	);

	layout.append(el);
	await showElement(layout);
	await Promise.race([ sleep(1000), nextClick() ]);
	await hideElement(layout);
	layout.removeChild(el);


	const list = getList();
	list.active = exampleLists.active;
	list.inactive = exampleLists.inactive;

	await nextFrame();

	layout.style.paddingTop = "60vh";

	el = message(
		"Die Einträge im weißen Bereich sollen eingekauft werden..."
	);

	box = highlightBox(list.dom.querySelector(".list.active"));

	layout.append(el);
	layout.append(box);
	await showElement(layout);
	await nextClick();
	await hideElement(layout);
	layout.removeChild(el);
	layout.removeChild(box);

	el = message(
		"Die Einträge im grauen Bereich sind bereits eingekauft..."
	);

	box = highlightBox(list.dom.querySelector(".list.inactive"));

	layout.append(el);
	layout.append(box);
	await showElement(layout);
	await nextClick();
	await hideElement(layout);
	layout.removeChild(el);
	layout.removeChild(box);

}

async function addEntry() {
	let el;
	const list = getList();

	const resetList = async () => {
		if (list.active.length + list.inactive.length === 0) {
			await Dialogs.info("Nein, nicht alles löschen. Nochmal.", "Nenene...");
			list.active = exampleLists.active;
			list.inactive = exampleLists.inactive;
		}
	};

	list.active = exampleLists.active;
	list.inactive = exampleLists.inactive;

	await nextFrame();

	list.addEventListener("remove", resetList);

	el = message(
		"Durch tippen auf einen aktiven Eintrag wird dieser in den inaktiven " +
		"Bereich verschoben..." +
		"\n\n" +
		"Tippe auf den Eintrag",
		true
	);

	await showElement(el);
	await nextEvent("deactivate", list);
	await hideElement(el);

	el = message(
		"Durch tippen auf einen inaktiven Eintrag wird dieser zurück in den aktiven " +
		"Bereich verschoben..." +
		"\n\n" +
		"Tippe auf den Eintrag",
		true
	);

	await showElement(el);
	await nextEvent("activate", list);
	await hideElement(el);

	el = message(
		"Durch gedrückt halten eines aktiven Eintrags kann man ihn editieren..." +
		"\n\n" +
		"Halte den Eintrag gedrückt um ihn zu ändern",
		true
	);


	await showElement(el);
	await nextEvent("change", list);
	await hideElement(el);

	list.removeEventListener("remove", resetList);

	el = message(
		"Durch gedrückt halten eines inaktiven Eintrags kann man ihn löschen..." +
		"\n\n" +
		"Halte einen inaktiven Eintrag gedrückt um ihn zu löschen.",
		true
	);

	await showElement(el);
	await nextEvent("remove", list);
	await hideElement(el);

	el = message(
		"Letzter Schritt:\n\n" +
		"Drücke auf den Plus-Knopf rechts um einen Eintrag hinzuzufügen...",
		true
	);

	await showElement(el);
	await nextEvent("add", list);
	await hideElement(el);
}

async function finished() {
	let el;

	const layout = layoutVertical.cloneNode();
	showElement(layout);

	el = title(
		"Danke! 😃"
	);

	layout.append(el);

	el = message(
		"Das wars. Jetzt fehlt nur noch dein Zugriffscode und du kannst starten..."
	);

	layout.append(el);
	await showElement(layout);
	await nextClick();
	await hideElement(layout);
	layout.removeChild(el);


	getList(true); // delete list;
}


// introduction

const steps = [
	welcome,
	emptyList,
	simpleList,
	addEntry,
	finished
];

export default async function introduction() {
	await dom.documentReady();
	for (const step of steps) {
		if (introSkipped.skipped) {
			break;
		}
		await Promise.race([ step(), introSkipped ]);
	}
}
