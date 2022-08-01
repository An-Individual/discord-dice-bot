const { BaseDieCountTracker, BaseFormatter } = require('../parser/parser');

class TestTracker extends BaseDieCountTracker {
	constructor() {
		super();
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
	}
}

class TestFormatter extends BaseFormatter {
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