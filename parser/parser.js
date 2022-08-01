const { resolveToNumber } = require('./resolution/parser.resolution');
const { carveDiceString } = require('./carving/parser.carving');
const { processCarvedHierarchy } = require('./processing/parser.processing');

function resolveDiceString(input, tracker, formatter) {
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
	let result = baseResolver.resolve(tracker, formatter);

	// Ensure the result is single number.
	result = resolveToNumber(result, formatter);

	return result;
}

function standardizeDiceString(str) {
	if (!str) return str;
	return str.replace(/\s+/g, '').toLowerCase();
}

module.exports = {
	resolveDiceString,
	standardizeDiceString,
};