const DiceFunctions = require('../parser.dice-functions');
const { ResolvedNumberType } = require('../parser.constants');

/**
 * The base object all the parser objects eventually get resolved to.
 * Tracks the number it represents, the type, text representing how
 * it was generated, and whether or not it's been discarded.
 */
class ResolvedNumber {
	constructor(value, text, type) {
		this.value = value;
		this.text = text;
		this.type = !type ? ResolvedNumberType.UNTYPED : type;
	}

	discard(formatter) {
		this.text = formatter.addDiscardedFormatting(this.text);
		this.discarded = true;
	}
}

/**
 * Turns a list of DieResultBases or ResolvedNumbers into a single ResolvedNumber.
 * Is a no-op if called on a single ResolvedNumber, but throws an error otherwise.
 * @param {*} object Either a ResolvedNumber, or a list of DieResultBases or ResolvedNumbers.
 * @param {BaseFormatter} formatter The formatter to apply when generating text.
 * @returns A ResolvedNumber representing the given object.
 */
function resolveToNumber(object, formatter) {
	// If it's already just a number return it.
	if (object instanceof ResolvedNumber) {
		return object;
	}

	// If it's an empty list throw an exception.
	if (!object.length) {
		throw new Error('Unknown syntax error');
	}

	// If it's a dice list turn it into a number list which will be
	// resolved to a single number in the next step.
	if (object[0] instanceof DiceFunctions.DieResultBase) {
		object = resolveDiceToNumberList(object, formatter);
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

/**
 * Converts a list of DieResultBases into a list of ResolveNumbers.
 * @param {DieResultBase[]} dice A list of die results.
 * @param {BaseFormatter} formatter The formatter to apply when generating text.
 * @returns A list of ResolvedNumbers.
 */
function resolveDiceToNumberList(dice, formatter) {
	return dice.map(d => {
		const result = new ResolvedNumber(d.value, getDieString(d, formatter));
		result.discarded = d.discarded;
		return result;
	});
}

/**
 * Joins the text from a list of ResolvedNumbers together using the given string.
 * Adds brackets if there are more than one.
 * @param {ResolvedNumber[]} numbers A list of resolved numbers.
 * @param {string} joinString The string used to join the numbers. Is ' + ' if not provided.
 * @returns The joined text from the resolved numbers with brackets if there is more than one.
 */
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

/**
 * Generates a string to represent the given DieResultBase.
 * @param {DieResultBase} die The DieResultBase to stringify.
 * @param {BaseFormatter} formatter The formatter to apply when generating text.
 * @returns A string represenging the given DieResultBase.
 */
function getDieString(die, formatter) {
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
		numString = formatter.addDiscardedFormatting(numString, true);
	}

	if (die.exploded) {
		numString = formatter.addExplodeFormatting(numString, true);
	}

	return numString;
}

module.exports = {
	ResolvedNumber,
	resolveToNumber,
	resolveDiceToNumberList,
	buildNumberListString,
};