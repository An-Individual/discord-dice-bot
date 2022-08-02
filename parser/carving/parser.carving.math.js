const { CharacterSets } = require('../parser.constants.js');

/**
 * Class used to represent math functions in the
 * carved/folded hierarchy.
 */
class MathFunction {
	constructor(symbol, left, right) {
		this.symbol = symbol;
		this.left = left;
		this.right = right;
	}
}

/**
 * Used by the carving step that breaks up brakets to handle
 * the strings that appear between them. It generates a hierarchy of
 * MathFunction objects that will apply math operations in the correct
 * order. For example '2*3+4*5' should be executed like '(2*3)+(4*5)'
 * even without the brackets. Depending on the situation these strings
 * can start or end with math functions that are missing the other half
 * of their input. This happens because the inputs to those math
 * functions are bracket objects. These black spaces are filled in later.
 * @param {string} text The text to parse.
 * @param {boolean} beforeBracket True if there was a bracket object parsed
 * just before this string. Used to tell the difference between a '-2' that's
 * just a negative number and math operation subtracting 2 from some absent
 * value.
 * @returns A MathFunction representing the hierarchy of math operations
 * performed with in the string, or just the string if none are present.
 */
function carveMathString(text, beforeBracket) {
	// Fold the sumation and subtraction operators first because they are
	// the lowest priority operators. When they're done, fold the multiplication
	// division, and modulo operators are as they are the next lowest priority.
	return carveMathByCharacters(text, '+-', carveMathMultDivMod, (idx) => {
		// We only consider ignoring '-' characters because we need to
		// separate their presence in negative numbers from their use
		// as math operators.
		if (text[idx] !== '-') {
			return false;
		}

		if (idx === 0) {
			// If we're aren't before a bracket ignore it, otherwise this
			// is an operator on the contents of the bracket.
			// We only want to do this during the first split, any sub splits
			// will occur immediately after math characters at index 0.
			if (beforeBracket) {
				return false;
			}
			return true;
		}

		// If we aren't at the start of a string we only ignore '-' if it comes
		// right after another math operator.
		return CharacterSets.MathOperators.indexOf(text[idx - 1]) >= 0;
	});
}

/**
 * Handles the carving and folding for multiplication, dividion, and modulo
 * math operators. Calls down to the exponent function since it's the exponents
 * are the highest priority math operation.
 * @param {*} text The text to parse.
 * @returns A MathFunction representing the hierarchy of math operations
 * performed with in the string, or just the string if none are present.
 */
function carveMathMultDivMod(text) {
	return carveMathByCharacters(text, '*/%', carveMathExponentiation);
}

/**
 * Handles the carving and folding for exponent operators. These are
 * the highest priority math function so they don't need to call down
 * to any further functions. However, they also have to fold things
 * in the opposite direction as the other operators.
 * Example: '3%6%4' is executed '((3%6)%4)' but '2^3^2' needs to be
 * executed '2^(3^2)'.
 * @param {*} text The text to parse.
 * @returns A MathFunction representing the hierarchy of math operations
 * performed with in the string, or just the string if none are present.
 */
function carveMathExponentiation(text) {
	if (!text) {
		return text;
	}

	const idx = text.indexOf('^');
	if (idx < 0) {
		return text;
	}

	const leftSide = idx === 0 ? '' : text.substring(0, idx);
	const rightSide = idx + 1 >= text.length ? '' : text.substr(idx + 1);

	return new MathFunction('^', leftSide, carveMathExponentiation(rightSide));
}

/**
 * Helper method used to carve and fold the non-exponent math operators.
 * @param {*} text The text to parse.
 * @param {*} splitterCharacters The math operator characters that divide
 * strings in this layer of the carving and folding.
 * @param {*} subSplitFunc An optional function to call on sub strings after the split.
 * @param {*} ignoreFunc An optional function to test if specific instances
 * of string splitting characters should be ignored.
 * @returns A MathFunction representing the hierarchy of math operations
 * performed with in the string, or just the string if none are present.
 */
function carveMathByCharacters(text, splitterCharacters, subSplitFunc, ignoreFunc) {
	const dividedTxt = splitStringOnCharacters(text, splitterCharacters, ignoreFunc);

	if (dividedTxt.length === 0) {
		return text;
	}

	// This process generates a result. Then each subsequent operator discovered
	// uses the current result as it's left side before absorbing it. This folds
	// the math so that things like '3%6%4' executed as '((3%6)%4)' rather
	// than '3%(6%4) which would produce different results.
	let startIdx = 0;
	let result = '';
	if (splitterCharacters.indexOf(dividedTxt[0]) < 0) {
		startIdx = 1;
		result = !subSplitFunc ? dividedTxt[0] : subSplitFunc(dividedTxt[0]);
	}

	for (let i = startIdx; i < dividedTxt.length; i++) {
		if (splitterCharacters.indexOf(dividedTxt[i]) < 0) {
			throw new Error('Math syntax error.');
		}

		const operator = dividedTxt[i];
		let rightSide = '';
		i++;
		if (i < dividedTxt.length) {
			rightSide = !subSplitFunc ? dividedTxt[i] : subSplitFunc(dividedTxt[i]);
		}

		result = new MathFunction(operator, result, rightSide);
	}

	return result;
}

/**
 * Helper method used by carveMathByCharacters() to convert the input text
 * into an array of strings it can iterate over instead of having to consider
 * each character individually. This keeps that code cleaner while it works
 * on folding the math in the right direction.
 * @param {*} text The text to split.
 * @param {*} splitterCharacters The characters to split the string on.
 * @param {*} ignoreFunc An optional function test if specific instances
 * of string splitting characters should be ignored.
 * @returns An array of strings generated by spliting the input string on the
 * specified characters.
 */
function splitStringOnCharacters(text, splitterCharacters, ignoreFunc) {
	const result = [];

	let startIdx = 0;
	for (let i = 0; i < text.length; i++) {
		if (splitterCharacters.indexOf(text[i]) >= 0 && (!ignoreFunc || !ignoreFunc(i))) {
			const leftSide = text.substring(startIdx, i);
			if (leftSide) {
				result.push(leftSide);
			}

			result.push(text[i]);
			startIdx = i + 1;
		}
	}

	if (startIdx < text.length) {
		result.push(text.substr(startIdx));
	}

	return result;
}

module.exports = {
	carveMathString,
	MathFunction,
};