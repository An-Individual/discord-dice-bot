const ParserObjects = require('./parser-objects');
const { DiceStringIterator } = require('./parser.iterator');
const { carveMathString, MathFunction } = require('./parser.carving.math');
const { carveDiceString } = require('./parser.carving');
const { processCarvedHierarchy } = require('./parser.processing');

function ResolveDiceString(input, tracker) {
	// Standardization ensures that the parser isn't
	// tripped up by variations in white space or capitalization
	input = standardizeDiceString(input);

	// Carve and fold the string into an intermediate hierarchy that will
	// make transforming it into processing objects that execute in the
	// correct order much easier.
	const carvedHierarchy = carveDiceString(input);

	// Process the hiearchy we carved in the previous step into a set
	// of objects that can actually execute the string.
	const baseResolver = processCarvedHierarchy(carvedHierarchy);

	// Finally resolve the string into its result.
	let result = baseResolver.resolve(tracker);

	// Ensure the result is single number.
	result = ParserObjects.resolveToNumber(result);

	return result;
}

function standardizeDiceString(str) {
	if (!str) return str;
	return str.replace(/\s+/g, '').toLowerCase();
}

module.exports = {
	ResolveDiceString,
	standardizeDiceString,
};