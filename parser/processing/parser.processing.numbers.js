const Errors = require('../parser.errors');
const { CharacterSets } = require('../parser.constants');

/**
 * Reads an integer out of the iterator. Throws an error if none is found.
 * @param {DiceStringIterator} iterator An iterator at an integer.
 * @returns An integer read from the iterator.
 */
function processInt(iterator) {
	let str = '';
	let peek = iterator.peek();

	Errors.throwIfDone(peek.done);
	if (!isIntChar(peek.value)) {
		throw new Error(`Unexpected character "${peek.value}" encountered parsing integer`);
	}

	while (!peek.done && isIntChar(peek.value)) {
		str += iterator.next().value;
		peek = iterator.peek();

		if (str.length > 1 && str.endsWith('-')) {
			throw new Error('Unexpected "-" after start of integer');
		}
	}

	return parseInt(str);
}

/**
 * Reads another integer out of the iterator and uses it as
 * the decimal point of the input integer to make a float.
 * Throws an error if none is found.
 * @param {DiceStringIterator} iterator Iterator at an integer that just passed a '.'
 * @param {Number} leadingInt The leading integer used in the float.
 * @returns A float based on the input integer and the one the iterator was at.
 */
function processFloat(iterator, leadingInt) {
	const decimals = processInt(iterator);
	return parseFloat(`${leadingInt}.${decimals}`);
}

/**
 * Tests if the input character belong to an integer.
 * @param {string} c The character to test.
 * @returns True if the character could be part of an integer. False otherwise.
 */
function isIntChar(c) {
	return c !== undefined && (c === '-' || CharacterSets.Numbers.indexOf(c) >= 0);
}

module.exports = {
	processInt,
	processFloat,
	isIntChar,
};