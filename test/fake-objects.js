class TestTracker {
	constructor() {
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
	}
}

class TestFormatter {
	addDiscardedFormatting(text) {
		if (!text) {
			return text;
		}

		return `~~${text.replace(/~~/g, '')}~~`;
	}

	addExplodeFormatting(text, isDie) {
		if (!isDie || !text) {
			return text;
		}

		return `**${text}**`;
	}

	addSuccessFormatting(text, isDie) {
		if (!isDie || !text) {
			return text;
		}

		return `__${text}__`;
	}

	addFailureFormatting(text, isDie) {
		if (!isDie || !text) {
			return text;
		}

		return `*${text}*`;
	}
}

module.exports = {
	TestTracker,
	TestFormatter,
};