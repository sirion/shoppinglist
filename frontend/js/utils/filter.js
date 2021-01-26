
export default class Filter {
	static propertyUnique(options, ...lists) {
		if (!options.property) {
			throw new Error("options.property must be set");
		}
		const result = {};
		if (options.start) {
			for (const e of options.start) {
				if (!options.removeEmpty || e) {
					result[e] = true;
				}
			}
		}

		for (const l of lists) {
			for (const e of l) {
				if (!options.removeEmpty || e[options.property]) {
					result[e[options.property]] = true;
				}
			}
		}

		return Object.keys(result);
	}
}
