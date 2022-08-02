const { CharacterSets } = require('../parser.constants.js');
const { processInt, isIntChar } = require('./parser.processing.numbers');

/**
 * Reads a compare point out of a an iterator and returns a function that
 * represnts the compare point's condition. Throws an error if no compare
 * compare point is found.
 * @param {DiceStringIterator} iterator An iterator at the start of a compare point.
 * @returns A function representing the compare point.
 */
function processModifierComparePoint(iterator) {
	if (isIntChar(iterator.peek().value)) {
		const num = processInt(iterator);
		return (value) => value === num;
	}

	const typeChar = iterator.next();
	const num = processInt(iterator);

	if (typeChar.value === '=') {
		return (value) => value === num;
	}
	else if (typeChar.value === '>') {
		return (value) => value > num;
	}
	else if (typeChar.value === '<') {
		return (value) => value < num;
	}

	throw new Error(`Unexpected compare point type "${typeChar.value}"`);
}

/**
 * Tests if the given character could represent the start of
 * a compare point.
 * @param {string} c The character to test.
 * @returns True if the character could be the start of a compare point. False otherwise.
 */
function isModifierComparePointChar(c) {
	return c !== undefined && (isIntChar(c) || CharacterSets.ComparePointOperators.indexOf(c) >= 0);
}


module.exports = {
	processModifierComparePoint,
	isModifierComparePointChar,
};