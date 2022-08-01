const { CharacterSets } = require('../parser.constants.js');
const { processInt, isIntChar } = require('./parser.processing.numbers');

function processModifierComparePoint(iterator) {
	if (isIntChar(iterator.peek().value)) {
		const num = processInt(iterator);
		return (value) => value === num;
	}

	return processComparePoint(iterator);
}

function processComparePoint(iterator) {
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

function isModifierComparePointChar(c) {
	return c !== undefined && (isIntChar(c) || CharacterSets.ComparePointOperators.indexOf(c) >= 0);
}


module.exports = {
	processModifierComparePoint,
	isModifierComparePointChar,
};