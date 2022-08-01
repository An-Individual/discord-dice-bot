const DiceFunctions = require('./dice-functions');
const { ResolvedNumberType } = require('./parser.constants');

class ResolvedNumber {
	constructor(value, text, type) {
		this.value = value;
		this.text = text;
		this.type = !type ? ResolvedNumberType.UNTYPED : type;
	}

	discard() {
		this.text = addDiscardedFormatting(this.text);
		this.discarded = true;
	}
}

function resolveToNumber(object) {
	// If it's already just a number return it.
	if (object instanceof ResolvedNumber) {
		return object;
	}

	// If it's an empty list throw an exception.
	if (!object.length) {
		throw new Error('Unknown syntax error');
	}

	// If it's a dice list turn it into a number list.
	if (object[0] instanceof DiceFunctions.DieResult) {
		object = resolveDiceToNumberList(object);
	}

	// If it's a number list sum the numbers into a single number.
	if (object[0] instanceof ResolvedNumber) {
		const txt = object.length === 1 ? object[0].text : `(${object.map(o => o.text).join(' + ')})`;
		const value = object.map(o => o.discarded ? 0 : o.value).reduce((c, v) => c + v);

		return new ResolvedNumber(value, txt);
	}

	// If we get here something mysterious has gone wrong.
	throw new Error('Unknown syntax error');
}

function resolveDiceToNumberList(dice) {
	return dice.map(d => {
		const result = new ResolvedNumber(d.value, getDieString(d));
		result.discarded = d.discarded;
		return result;
	});
}

function buildNumberListString(numbers, joinString) {
	if (!numbers) {
		return '';
	}

	joinString = !joinString ? ' + ' : joinString;

	if (numbers.length === 1) {
		return numbers[0].text;
	}

	return `(${numbers.map(v => v.text).join(joinString)})`;
}

function getDieString(die) {
	let numString = '[' + die.rolls[0].toString();
	for (let i = 1; i < die.rolls.length; i++) {
		if (die.rolls[i] >= 0) {
			numString += '+';
		}
		numString += die.rolls[i].toString();
	}

	if (die.rolls.length > 1) {
		numString += '=' + die.value;
	}

	numString += ']';

	if (die.discarded) {
		numString = addDiscardedFormatting(numString);
	}

	if (die.exploded) {
		numString = addExplodeFormatting(numString);
	}

	return numString;
}

function addDiscardedFormatting(text) {
	if (!text) {
		return text;
	}

	return `~~${text.replace(/~~/g, '')}~~`;
}

function addExplodeFormatting(text) {
	if (!text) {
		return text;
	}

	return `**${text}**`;
}

function addSuccessFormatting(text) {
	if (!text) {
		return text;
	}

	return `__${text}__`;
}

function addFailureFormatting(text) {
	if (!text) {
		return text;
	}

	return `*${text}*`;
}

module.exports = {
	ResolvedNumber,
	resolveToNumber,
	resolveDiceToNumberList,
	buildNumberListString,
	addDiscardedFormatting,
	addExplodeFormatting,
	addSuccessFormatting,
	addFailureFormatting,
};