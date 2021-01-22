class DOMTools {

	/**
	 * Returns a promise that resolves when the given event on the given element is fired the next time
	 *
	 * @param {HTMLElement} element - The element on which to listen for the given event
	 * @param {string} eventname - The name of the event to listen for
	 * @returns {Promise<Event>} - The resolved promise with the fired event
	 */
	static async nextEvent(element, eventname) {
		await new Promise(resolve => element.addEventListener(eventname, resolve));
	}


	/**
	 * Returns a promise that resolves when the page (without external content) has been loaded
	 *
	 * @returns {Promise<Event>} - The resolved promise with the DOMContentLoaded event
	 */
	static async documentReady() {
		await DOMTools.documenReadyPromise;
	}


	/**
	 * Removes all child nodes from the given element
	 *
	 * @param {HTMLElement} element - The element that should be cleared
	 * @returns {void}
	 */
	static clearElement(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	}


	/**
	 * Creates a DOM element of the given type (tag name) from the given attribute object. If an
	 * attribute property is a tring it is set on the element, if it is an object, a new sub element
	 * is creates with the property-name as type. If an anntribute property is an array of objects,
	 * several sub elements of the same type are created.
	 * This leads to the disadvantage that no element with several sub-elements of the same type that
	 * do not follow each other can not be created by this function.
	 *
	 *
	 * @param {string} type Element type
	 * @param {map} attributes
	 * @param {string} namespace The namespace in which the element is created
	 * @returns {HTMLElement}
	 */
	static createElement(type, attributes, namespace) {
		var el;

		if (!namespace) {
			if (type.toLowerCase() === "svg") {
				namespace = "http://www.w3.org/2000/svg";
			} else {
				namespace = null;
			}
		}

		if (namespace) {
			el = document.createElementNS(namespace, type);
		} else {
			el = document.createElement(type);
		}

		// Short syntax: string conly creates an element with textContent
		if (typeof(attributes) === "string") {
			el.textContent = attributes;
			return el;
		} else if (attributes instanceof Node) {
			el.append(attributes);
			return el;
		}

		for (var name in attributes) {
			if (attributes[name] === undefined) {
				continue;
			} else if (Array.isArray(attributes[name])) {
				// Mutiple sub elements of same type
				attributes[name].forEach(attr => {
					el.appendChild(DOMTools.createElement(name, attr, namespace));
				});
			} else if (attributes[name] === null) {
				// Text node
				el.appendChild(document.createTextNode(name));
			} else if (name === "textContent") {
				// Text node
				el.textContent = attributes[name];
			} else if (name === "style") {
				// Styles
				Object.keys(attributes[name]).forEach(key => {
					el.style[key] = attributes[name][key];
				});
			} else if (attributes[name] instanceof Element) {
				// Just add the already created element
				el.appendChild(attributes[name]);
			} else if (typeof attributes[name] === "function") {
				// Event callback
				el.addEventListener(name, attributes[name]);
			} else if (typeof attributes[name] === "object") {
				// Sub element
				el.appendChild(DOMTools.createElement(name, attributes[name], namespace));
			} else {
				// Attribute
				if (name.indexOf("xlink:") === 0) {
					el.setAttributeNS("http://www.w3.org/1999/xlink", name, attributes[name]);
				} else if (typeof attributes[name] === "boolean") {
					if (attributes[name]) {
						el.setAttribute(name, "");
					}
				} else {
					el.setAttribute(name, attributes[name]);
				}
			}
		}
		return el;
	}
}

/**
 * Promise that resolves when the page (without external content) has been loaded
 */
if (document.readyState === "interactive" || document.readyState === "complete") {
	DOMTools.documenReadyPromise = Promise.resolve();
} else {
	DOMTools.documenReadyPromise = DOMTools.nextEvent(window, "DOMContentLoaded");
}

export default DOMTools;
