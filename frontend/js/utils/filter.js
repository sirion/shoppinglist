
export default class Filter {
	static propertyUnique(options, ...lists) {
		if (!options.property) {
			throw new Error("options.property must be set");
		}
		const result = {};
		if (options.start) {
			for (let e of options.start) {
				if (!options.removeEmpty || e) {
					result[e] = true;
				}
			}
		}

		for (let l of lists) {
			for (let e of l) {
				if (!options.removeEmpty || e[options.property]) {
					result[e[options.property]] = true;
				}
			}
		}

		return Object.keys(result);
	}
}