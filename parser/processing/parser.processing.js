const Errors = require('../parser.errors');
const ParserObjects = require('../resolution/parser.resolution.objects');
const { ParserResolveTypes, FunctionNames } = require('../parser.constants');
const { DiceStringIterator } = require('../parser.iterator');
const { MathFunction } = require('../carving/parser.carving.math');
const { Brackets } = require('../carving/parser.carving');
const { processInt, processFloat } = require('./parser.processing.numbers');
const { processDice, processListResolver, processKeepDropModifier } = require('./parser.processing.dice');

/**
 * Root method of the processing step. Primarily here to flag
 * the root method to readers and external systems since the
 * actual core method is recurrsive.
 * @param {*} object Root object output by the carving and folding step.
 * @returns A hierarchy of ProcessorObjects that can be resolved
 * to execute the input dice string.
 */
function processCarvedHierarchy(object) {
	return processGeneral(object);
}

/**
 * Core method in the processing recursion loop. If a method
 * isn't sure what one of it's children is it calls this.
 * @param {*} object Either a string representing a number or
 * dice roll, a MathFunction, or Brackets wrapper.
 * @returns A hierarchy of ProcessorObjects that can be resolved to execute
 * the parts of the dice roll that appear at or below this point in the
 * carved and folded hierarhcy.
 */
function processGeneral(object) {
	if (object instanceof Brackets) {
		return processBrackets(object);
	}
	else if (object instanceof MathFunction) {
		return processMathFunction(object);
	}
	else if (typeof object === 'string') {
		return processNumberOrDice(object);
	}
	else {
		throw new Error('Unknown syntax error');
	}
}

/**
 * Handles insteances of Brackets in the carved/folded hierarchy.
 * Brackets objects can represent functions, number lists, or might
 * just be wrappers around other heirarchy objects.
 * @param {Brackets} brackets A Brackets object from the carved/folded hierarchy.
 * @returns A ProcessingObject that can be resolved to execute this
 * object and its children.
 */
function processBrackets(brackets) {
	const entries = brackets.elements.map(e => processGeneral(e));

	if (!brackets.isList && entries.length != 1) {
		throw new Error('Unknown syntax error');
	}

	if (brackets.isList) {
		if (entries.length === 1 && entries[0].getResolveType() === ParserResolveTypes.DICE_ROLL) {
			return processBracketsModifiers(entries[0], brackets.modifierSuffix);
		}

		return processBracketsModifiers(new ParserObjects.NumberList(entries), brackets.modifierSuffix);
	}

	if (brackets.functionName) {
		switch (brackets.functionName) {
			case FunctionNames.FLOOR:
				return new ParserObjects.Floor(entries[0]);
			case FunctionNames.CEIL:
				return new ParserObjects.Ceiling(entries[0]);
			case FunctionNames.ROUND:
				return new ParserObjects.Round(entries[0]);
			case FunctionNames.ABS:
				return new ParserObjects.Absolute(entries[0]);
			default:
				throw new Error(`Unknown function name "${brackets.functionName}"`);
		}
	}

	return new ParserObjects.Bracket(entries[0]);
}

/**
 * A helper method of processBrackets() that handles the modifier suffix.
 * The suffix can be success/fail or match resolves or keep.drop modifiers.
 * If the text contains more than 1 modifier, or other superfluous text,
 * this method throws an error.
 * @param {*} object The ParserObject to wrap if a modifier is present.
 * @param {*} modifierSuffix The suffix string of the Brackets object.
 * @returns Either the input ParserObject or a ParserObject wrapping it
 * that applies the modifier from the suffix.
 */
function processBracketsModifiers(object, modifierSuffix) {
	const iterator = new DiceStringIterator(modifierSuffix);
	const current = iterator.peek();
	if (current.done) {
		return object;
	}

	object = processListResolver(iterator, object);
	if (iterator.index >= 0) {
		Errors.throwIfNotDone(iterator.peek());
		return object;
	}

	if (current.value === 'd' || current.value === 'k') {
		object = processKeepDropModifier(iterator, object);
		Errors.throwIfNotDone(iterator.peek());
		return object;
	}

	throw new Error(`Unknown bracket modifiers "${modifierSuffix}"`);
}

/**
 * Processes the two halves of a math function and combines them
 * into the appropriate parser object.
 * @param {MathFunction} mathFunc MathFunction object from the carved/folded hierarchy.
 * @returns A ParserObject that performs the appropariate operation between the left
 * and right halves of the input's carved/folded hierarhcy.
 */
function processMathFunction(mathFunc) {
	const left = processGeneral(mathFunc.left);
	const right = processGeneral(mathFunc.right);

	switch (mathFunc.symbol) {
		case '+':
			return new ParserObjects.MathAdd(left, right);
		case '-':
			return new ParserObjects.MathSubtract(left, right);
		case '*':
			return new ParserObjects.MathMultiply(left, right);
		case '/':
			return new ParserObjects.MathDivide(left, right);
		case '%':
			return new ParserObjects.MathModulo(left, right);
		case '^':
			return new ParserObjects.MathExponent(left, right);
		default:
			throw new Error('Unknown syntax error');
	}
}

/**
 * Handles the case where processGeneral() is looking at text.
 * The text could represent an integer. A float. Or a dice roll
 * with a list of modifiers and up to 1 resolver.
 * @param {*} text The text from the carve/fold hierarchy to parse.
 * @returns A ProcessorObject that resolves to either a number or
 * dice roll depending on the input text.
 */
function processNumberOrDice(text) {
	const iterator = new DiceStringIterator(text);
	let current = iterator.peek();
	Errors.throwIfDone(current.done);

	let num;
	if (current.value !== 'd') {
		num = processInt(iterator);
		current = iterator.peek();
	}
	else {
		// Dice strings without a leading number always roll 1 die.
		num = 1;
	}

	// Handle floats
	if (current.value === '.') {
		iterator.next();
		const val = processFloat(iterator, num);

		Errors.throwIfNotDone(iterator.next());
		return new ParserObjects.StaticNumber(val);
	}

	// Handle dice
	if (current.value === 'd') {
		return processDice(iterator, num);
	}

	// Otherwise it's just an integer
	Errors.throwIfNotDone(iterator.next());
	return new ParserObjects.StaticNumber(num);
}

module.exports = {
	processCarvedHierarchy,
	// Testing Exports
	processNumberOrDice,
	processBrackets,
};