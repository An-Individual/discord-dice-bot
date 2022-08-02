const { resolveToNumber } = require('./resolution/parser.resolution');
const { carveDiceString } = require('./carving/parser.carving');
const { processCarvedHierarchy } = require('./processing/parser.processing');
const Errors = require('./parser.errors');

/**
 * Parses and resolves the given dice string.
 * @param {string} input The dice string to parse and resolve.
 * @param {BaseDieCountTracker} tracker The tracker to keep track of how many dice have been rolled.
 * @param {BaseFormatter} formatter The formatter used to apply text formatting.
 * @returns A ResolveNumber object containing the final number, its type, and
 * the text representing how that result was reached.
 */
function resolveDiceString(input, tracker, formatter) {
	// Standardization ensures that the parser isn't
	// tripped up by variations in white space or capitalization
	input = standardizeDiceString(input);

	// Carve and fold the string into an intermediate hierarchy that will
	// make it much easier to order the final objects that execute the
	// string correctly.
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

/**
 * Removes all white space from the given string and
 * converts all text characters to lower case.
 * @param {string} str The string to standardize.
 * @returns The standardized string.
 */
function standardizeDiceString(str) {
	if (!str) return str;
	return str.replace(/\s+/g, '').toLowerCase();
}

/**
 * Base class for tracking the number of dice rolled in a single command.
 */
class BaseDieCountTracker {
	/**
	 * Increments the count of rolled dice and throws an error if it
	 * exceeds a configured maximum.
	 * @param {Number} num The number of new dice being rolled.
	 */
	notifyNewDice() {
		Errors.throwNotImplemented('nodifyNewDice()');
	}
}

/**
 * Base class for applying text formatting.
 */
class BaseFormatter {
	/**
	 * Applys discard formatting
	 * @param {*} text The text to apply formatting to.
	 * @param {*} isDie Whether or not the text represents a die.
	 * @returns The input text with any appropriate formatting added.
	 */
	addDiscardedFormatting() {
		Errors.throwNotImplemented('addDiscardedFormatting()');
	}

	/**
	 * Applys explode formatting
	 * @param {*} text The text to apply formatting to.
	 * @param {*} isDie Whether or not the text represents a die.
	 * @returns The input text with any appropriate formatting added.
	 */
	addExplodeFormatting() {
		Errors.throwNotImplemented('addExplodeFormatting()');
	}

	/**
	 * Applys success formatting
	 * @param {*} text The text to apply formatting to.
	 * @param {*} isDie Whether or not the text represents a die.
	 * @returns The input text with any appropriate formatting added.
	 */
	addSuccessFormatting() {
		Errors.throwNotImplemented('addSuccessFormatting()');
	}

	/**
	 * Applys failure formatting
	 * @param {*} text The text to apply formatting to.
	 * @param {*} isDie Whether or not the text represents a die.
	 * @returns The input text with any appropriate formatting added.
	 */
	addFailureFormatting() {
		Errors.throwNotImplemented('addFailureFormatting()');
	}
}

module.exports = {
	resolveDiceString,
	standardizeDiceString,
	BaseDieCountTracker,
	BaseFormatter,
};