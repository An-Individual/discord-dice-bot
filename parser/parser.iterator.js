const DiceStringIterator = class {
	constructor(text) {
		this.txt = text;
		this.index = -1;
	}

	next() {
		this.index++;
		if (!this.txt || this.txt.length <= this.index) {
			return {
				done: true,
			};
		}
		else {
			return {
				value: this.txt[this.index],
			};
		}
	}

	peek() {
		if (!this.txt || this.txt.length <= this.index + 1) {
			return {
				done: true,
			};
		}
		else {
			return {
				value: this.txt[this.index + 1],
			};
		}
	}
};

module.exports = {
	DiceStringIterator,
};