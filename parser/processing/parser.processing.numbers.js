const Errors = require('../parser.errors');
const { CharacterSets } = require('../parser.constants');

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

function processFloat(iterator, leadingInt) {
	const decimals = processInt(iterator);
	return parseFloat(`${leadingInt}.${decimals}`);
}

function isIntChar(c) {
	return c !== undefined && (c === '-' || CharacterSets.Numbers.indexOf(c) >= 0);
}

module.exports = {
	processInt,
	processFloat,
	isIntChar,
};