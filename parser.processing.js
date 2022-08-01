const Errors = require('./parser.errors');
const ParserObjects = require('./parser.resolution.objects');
const { ParserResolveTypes } = require('./parser.constants');
const { DiceStringIterator } = require('./parser.iterator');
const { FunctionNames } = require('./parser.constants');
const { MathFunction } = require('./parser.carving.math');
const { Brackets } = require('./parser.carving');
const { processInt, processFloat } = require('./parser.processing.numbers');
const { processDice, processListResolver, processKeepDropModifier } = require('./parser.processing.dice');

function processCarvedHierarchy(object) {
	return processGeneral(object);
}

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