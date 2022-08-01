const { FunctionList, CharacterSets } = require('../parser.constants.js');
const { DiceStringIterator } = require('../parser.iterator');
const { carveMathString } = require('./parser.carving.math');
const { foldAdjacentObjectsIntoMathFuncs } = require('./parser.carving.math.folding');
const Errors = require('../parser.errors');

class Brackets {
	constructor(isList) {
		this.elements = [];
		this.isList = isList;
		this.functionName = '';
		this.modifierSuffix = '';
	}
}

function carveDiceString(diceString) {
	const iterator = new DiceStringIterator(diceString);
	return carveDiceStringByBrackets(iterator);
}

function carveDiceStringByBrackets(iterator, isList, requiredTerminationChars) {
	const result = new Brackets(isList);

	if (isList) {
		let entry;
		do {
			entry = carveDiceStringByBrackets(iterator, false, '},');
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

	const terminatingChars = ')},';
	let currentChar;
	let currentElementTxt = '';
	do {
		currentChar = iterator.next();
		if (currentChar.done || terminatingChars.indexOf(currentChar.value) >= 0) {
			break;
		}

		if (currentChar.value === '(' || currentChar.value === '{') {
			let funcTxt;
			if (currentChar.value === '(') {
				funcTxt = checkForFunction(currentElementTxt);
				if (funcTxt) {
					currentElementTxt = currentElementTxt.slice(0, -1 * funcTxt.length);
				}
			}

			if (currentElementTxt) {
				result.elements.push(carveMathString(currentElementTxt, result.elements.length > 0));
				currentElementTxt = '';
			}

			const childIsList = currentChar.value === '{';
			const bracketContent = carveDiceStringByBrackets(iterator, childIsList, childIsList ? '}' : ')');
			bracketContent.functionName = funcTxt;

			if (bracketContent.isList) {
				bracketContent.modifierSuffix = readListModifierCharacters(iterator);
			}

			result.elements.push(bracketContent);
		}
		else {
			currentElementTxt += currentChar.value;
		}
	} while (!currentChar.done);

	result.terminatingChar = currentChar.value;

	if (requiredTerminationChars && requiredTerminationChars.indexOf(result.terminatingChar) < 0) {
		throw new Error('Bracket not closed.');
	}
	else if (!requiredTerminationChars && result.terminatingChar) {
		// If we aren't requiring terminating characters but we hit one
		// then there's a close without a matching opening so we fail.
		throw new Error('Unexpected open bracket or comma');
	}

	if (currentElementTxt) {
		result.elements.push(carveMathString(currentElementTxt, result.elements.length > 0));
	}

	result.elements = foldAdjacentObjectsIntoMathFuncs(result.elements);

	if (result.elements.length > 1) {
		throw new Error('Unknown syntax error');
	}

	// If this is the root carve then return the element instead
	// of the bracket object to cut down on bracket clutter.
	if (!requiredTerminationChars) {
		return result.elements[0];
	}

	return result;
}

function checkForFunction(elementTxt) {
	for (let i = 0; i < FunctionList.length; i++) {
		if (elementTxt.endsWith(FunctionList[i])) {
			return FunctionList[i];
		}
	}

	return '';
}

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