const { FunctionList, CharacterSets } = require('../parser.constants.js');
const { DiceStringIterator } = require('../parser.iterator');
const { carveMathString } = require('./parser.carving.math');
const { foldAdjacentObjectsIntoMathFuncs } = require('./parser.carving.math.folding');
const Errors = require('../parser.errors');

/**
 * Class used to represent brackets in the carved/folded
 * hierarchy. Brackets can represent functions, number
 * lists, or wrappers used to affect the ordering of
 * math operations.
 */
class Brackets {
	constructor(isList) {
		this.elements = [];
		this.isList = isList;
		this.functionName = '';
		this.modifierSuffix = '';
	}
}

/**
 * The root function for the carving and folding component. Takes a dice string and
 * returns a hierarchy of Brackers, MathFunctions, and strings that can be easily
 * processed into ParserObjects that resolve in the correct order.
 * @param {string} diceString The dice string to parse.
 * @returns A hierarhcy of Brackers, MathFunctions, and strings.
 */
function carveDiceString(diceString) {
	const iterator = new DiceStringIterator(diceString);
	// Unless the an empty string was provided, the carve step
	// will always produce a Brackets object with only 1 element.
	// Returning the Brackets object would result in superfluous
	// brackets being added to the result string so we unwrap that
	// element here. If the empty string was provided, returning
	// undefined is an acceptable result.
	return carveDiceStringByBrackets(iterator).elements[0];
}

/**
 * The work horse of the carving and folding process. This function takes an
 * iterator either at the start of the entire dice string, right after the
 * opening of a '(' bracket, or right at the start of a list entry, and
 * performs the folding and carving process on everything within that bracket
 * or list entry (or the entire string if it's at the start). If it encounters
 * another opening bracket, it handles the content of that bracket recursively.
 * It also feeds it's strings through the math carving and folding system.
 * @param {DiceStringIterator} iterator An iterator either at the start of a
 * dice string, right after the opening of a bracket, or at the start of a
 * list entry.
 * @param {string} requiredTerminationChars If provided, the parser with stop
 * and return the bracket it has built if it hits any character in the provided
 * string. Used to stop at closing brackets or ',' separators in list entries.
 * If not provided it is assumed that this is the call to carve the entire string.
 * @returns A Brackets object containing a single element representing the
 * carved and folded version of the Bracket's content.
 */
function carveDiceStringByBrackets(iterator, requiredTerminationChars) {
	const result = new Brackets();

	const terminatingChars = ')},';
	let currentChar;
	let currentElementTxt = '';
	do {
		currentChar = iterator.next();
		// If the iterator is empty or we've hit a point where we're supposed to call
		// up to the parent of a recurssive call of this function, stop the loop.
		if (currentChar.done || terminatingChars.indexOf(currentChar.value) >= 0) {
			break;
		}

		// If we've hit the start of a sub bracket, we need to flush any text we've
		// read into our curent bracket's elements, make a recurssive call to handle
		// the sub bracket, and add that bracket to our bracket's results, before
		// continuing.
		if (currentChar.value === '(' || currentChar.value === '{') {
			// Step 1: Check to see if the current text buffer ends with
			// the name of a function. If it does, record it and chop those
			// characters out of the buffer.
			let funcTxt;
			if (currentChar.value === '(') {
				funcTxt = checkForFunction(currentElementTxt);
				if (funcTxt) {
					currentElementTxt = currentElementTxt.slice(0, -1 * funcTxt.length);
				}
			}

			// Step 2: If our buffer has text in it, feed it through the math carving and folding
			// and push the result into the curent bracket's element list. Any empty slots left
			// in MathFunctions wll be handled later.
			if (currentElementTxt) {
				result.elements.push(carveMathString(currentElementTxt, result.elements.length > 0));
				currentElementTxt = '';
			}

			// Step 3: Parse the sub bracket as either a list or a regular bracket depending
			// on what kind of opening bracket was used.
			let bracketContent;
			if (currentChar.value === '{') {
				bracketContent = carveBracketEntryList(iterator);
			}
			else {
				bracketContent = carveDiceStringByBrackets(iterator, ')');
			}

			// Step 4: Apply the function name to the sub bracket object along with
			// any modifier characters present in the suffix.
			bracketContent.functionName = funcTxt;
			if (bracketContent.isList) {
				bracketContent.modifierSuffix = readListModifierCharacters(iterator);
			}

			// Step 5: Push the bracket object into the current bracket's element list.
			result.elements.push(bracketContent);
		}
		else {
			// Otherwise push the current character into the buffer.
			currentElementTxt += currentChar.value;
		}
	} while (!currentChar.done);

	result.terminatingChar = currentChar.value;

	// If we have a terminating character we need to make sure it's one of the ones we expected.
	if (requiredTerminationChars && requiredTerminationChars.indexOf(result.terminatingChar) < 0) {
		throw new Error('Bracket not closed.');
	}
	else if (!requiredTerminationChars && result.terminatingChar) {
		// If we aren't requiring terminating characters but we hit one
		// then there's a close without a matching open so we fail.
		throw new Error('Unexpected closing bracket or comma');
	}

	// Perform a final flush of the buffer into the current bracket's elements (including
	// the math carving and folding step).
	if (currentElementTxt) {
		result.elements.push(carveMathString(currentElementTxt, result.elements.length > 0));
	}

	// Since this bracket isn't a list, we need math functions to fill their empty slots
	// from their adjacent elements.
	result.elements = foldAdjacentObjectsIntoMathFuncs(result.elements);

	// If there is more than one remaining element after the math functions consume their
	// neighbors then there is a syntax error like two brackets next to each other that
	// aren't linked by math operators.
	if (result.elements.length > 1) {
		throw new Error('Unknown syntax error');
	}

	return result;
}

/**
 * A helper function for carveDiceStringByBrackets(). Creates a
 * Brackets object representing a number list and carves and folds
 * each of the list's entries.
 * @param {*} iterator An iterator pointing at the character immediately
 * after the '{' character that marks the start of a number list.
 * @returns A Brackets object representing a number list.
 */
function carveBracketEntryList(iterator) {
	const result = new Brackets(true);

	let entry;
	do {
		entry = carveDiceStringByBrackets(iterator, '},');
		if (entry.elements.length > 0) {
			result.elements.push(entry);
		}
		Errors.throwIfDone(!entry.terminatingChar);
		if (entry.terminatingChar !== ',' && entry.terminatingChar !== '}') {
			Errors.throwUnexpectedChar(entry.terminatingChar);
		}
	} while (entry.terminatingChar !== '}');

	return result;
}

/**
 * A helper method for carveDiceStringByBrackets(). Given the
 * string that appeared before a bracket, checks to see if that
 * string ends with any function names.
 * @param {*} elementTxt The text that appears before a bracket.
 * @returns Any function name that appears at the end fo the input
 * text or the empty string if none are.
 */
function checkForFunction(elementTxt) {
	for (let i = 0; i < FunctionList.length; i++) {
		if (elementTxt.endsWith(FunctionList[i])) {
			return FunctionList[i];
		}
	}

	return '';
}

/**
 * A helper method for carveDiceStringByBrackets(). Takes an iterator
 * pointed at the suffix location for a set of brackets and reads
 * any characters present that could represent modifiers.
 * @param {DiceStringIterator} iterator Iterator at the suffix location
 * for a set of brackets.
 * @returns Any bracket suffix characters present at the iterator location.
 */
function readListModifierCharacters(iterator) {
	let result = '';
	let currentChar = iterator.peek();
	while (!currentChar.done && CharacterSets.SetModifierCharacters.indexOf(currentChar.value) >= 0) {
		// Negative integers are only permitted after a letter or compare
		// character, otherwise it actual denotes a separate math function.
		if (currentChar.value === '-') {
			if (!result || (CharacterSets.ComparePointOperators.indexOf(result[result.length - 1]) < 0 && CharacterSets.Letters.indexOf(result[result.length - 1]) < 0)) {
				break;
			}
		}

		result += currentChar.value;
		iterator.next();
		currentChar = iterator.peek();
	}

	return result;
}

module.exports = {
	carveDiceString,
	Brackets,
};