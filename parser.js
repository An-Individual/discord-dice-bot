const ParserObjects = require('./parser-objects');
const Errors = require('./parser.errors');
const { DiceStringIterator } = require('./parser.iterator');
const { KeepDropType, FunctionNames, CharacterSets } = require('./parser.constants');
const { carveMathString, MathFunction } = require('./parser.carving.math');
const { carveDiceString, Brackets } = require('./parser.carving');

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
	const baseResolver = ProcessFunctions.processGeneral(carvedHierarchy);

	// Finally resolve the string into its result.
	let result = baseResolver.resolve(tracker);

	// Ensure the result is single number.
	result = ParserObjects.resolveToNumber(result);

	return result;
}

class ProcessFunctions {
	static processGeneral(object) {
		if (object instanceof Brackets) {
			return this.processBrackets(object);
		}
		else if (object instanceof MathFunction) {
			return this.processMathFunction(object);
		}
		else if (typeof object === 'string') {
			return this.processNumberOrDice(object);
		}
		else {
			throw new Error('Unknown syntax error');
		}
	}

	static processBrackets(brackets) {
		const entries = brackets.elements.map(e => this.processGeneral(e));

		if (!brackets.isList && entries.length != 1) {
			throw new Error('Unknown syntax error');
		}

		if (brackets.isList) {
			if (entries.length === 1 && entries[0].getResolveType() === ParserObjects.ParserResolveTypes.DICE_ROLL) {
				return this.processBracketsModifiers(entries[0], brackets.modifierSuffix);
			}

			return this.processBracketsModifiers(new ParserObjects.NumberList(entries), brackets.modifierSuffix);
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

	static processBracketsModifiers(object, modifierSuffix) {
		const iterator = new DiceStringIterator(modifierSuffix);
		const current = iterator.peek();
		if (current.done) {
			return object;
		}

		object = this.processListResolver(iterator, object);
		if (iterator.index >= 0) {
			Errors.throwIfNotDone(iterator.peek());
			return object;
		}

		if (current.value === 'd' || current.value === 'k') {
			object = this.processKeepDropModifier(iterator, object);
			Errors.throwIfNotDone(iterator.peek());
			return object;
		}

		throw new Error(`Unknown bracket modifiers "${modifierSuffix}"`);
	}

	static processMathFunction(mathFunc) {
		const left = this.processGeneral(mathFunc.left);
		const right = this.processGeneral(mathFunc.right);

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

	static processNumberOrDice(text) {
		const iterator = new DiceStringIterator(text);
		let current = iterator.peek();
		Errors.throwIfDone(current.done);

		let num;
		if (current.value !== 'd') {
			num = this.processInt(iterator);
			current = iterator.peek();
		}
		else {
			num = 1;
		}

		// Handle floats
		if (current.value === '.') {
			iterator.next();
			const decimals = this.processInt(iterator);
			const val = parseFloat(`${num}.${decimals}`);

			Errors.throwIfNotDone(iterator.next());
			return new ParserObjects.StaticNumber(val);
		}

		// Handle dice
		if (current.value === 'd') {
			const coreDice = this.processSimpleDiceString(iterator, num);

			// The modifier loop needs to invert the wrappers as it goes
			// so that the modifiers will execute in the order they appear
			// instead of the reverse order.
			let lastDice = coreDice;
			let outerDice = coreDice;
			let lastIdx;
			do {
				lastIdx = iterator.index;
				const newDice = this.processRollModifier(iterator, coreDice);
				if (lastIdx !== iterator.index) {
					if (!lastDice.child) {
						lastDice = newDice;
						outerDice = newDice;
					}
					else {
						lastDice.child = newDice;
						lastDice = newDice;
					}
				}
			} while (lastIdx !== iterator.index);

			outerDice = this.processListResolver(iterator, outerDice);

			Errors.throwIfNotDone(iterator.next());
			return outerDice;
		}

		// Otherwise it's just an integer
		Errors.throwIfNotDone(iterator.next());
		return new ParserObjects.StaticNumber(num);
	}

	static processSimpleDiceString(iterator, numDice) {
		let current = iterator.next();

		Errors.throwIfDone(current.done);
		if (current.value != 'd') {
			throw new Error(`Expected character 'd' at position ${iterator.index}`);
		}

		current = iterator.peek();
		if (isIntChar(current.value)) {
			const dieSize = this.processInt(iterator);

			if (dieSize < 1) {
				throw new Error('Dice must have 1 or more faces');
			}

			return new ParserObjects.DiceRoll(numDice, dieSize);
		}

		if (current.value === 'f') {
			iterator.next();
			return new ParserObjects.DiceRoll(numDice, 1, -1);
		}

		Errors.throwIfDone(current.done);
		Errors.throwUnexpectedChar(current.value);
	}

	static processRollModifier(iterator, diceRoll) {
		const current = iterator.peek();

		if (current.value === '!') {
			return this.processExplosionModifier(iterator, diceRoll);
		}
		else if (current.value === 'r') {
			return this.processRerollModifier(iterator, diceRoll);
		}
		else if (current.value === 'k' || current.value === 'd') {
			return this.processKeepDropModifier(iterator, diceRoll);
		}

		return diceRoll;
	}

	static processExplosionModifier(iterator, diceRoll) {
		if (iterator.next().value !== '!') {
			throw new Error(`Expected explosion character at position ${iterator.index}`);
		}
		let current = iterator.peek();
		if (current.value === '!') {
			iterator.next();
			current = iterator.peek();
			let compare;
			if (this.isModifierComparePointChar(current.value)) {
				compare = this.processModifierComparePoint(iterator);
			}
			return new ParserObjects.DiceExplosionCompounding(diceRoll, compare);
		}
		else if (current.value === 'p') {
			iterator.next();
			current = iterator.peek();
			let compare;
			if (this.isModifierComparePointChar(current.value)) {
				compare = this.processModifierComparePoint(iterator);
			}
			return new ParserObjects.DiceExplosionPenetrating(diceRoll, compare);
		}
		else {
			let compare;
			if (this.isModifierComparePointChar(current.value)) {
				compare = this.processModifierComparePoint(iterator);
			}
			return new ParserObjects.DiceExplosionRegular(diceRoll, compare);
		}
	}

	static processRerollModifier(iterator, diceRoll) {
		if (iterator.next().value !== 'r') {
			throw new Error(`Expected reroll character at position ${iterator.index}`);
		}
		let current = iterator.peek();
		let rerollOnce = false;
		if (current.value === 'o') {
			iterator.next();
			current = iterator.peek();
			rerollOnce = true;
		}

		const conditions = [];
		conditions.push(this.processModifierComparePoint(iterator));

		current = iterator.peek();
		while (current.value === 'r') {
			// Cheat the iterator a little so we can make sure we aren't mixing
			// rerolls and reroll onces.
			if ((rerollOnce && iterator.txt[iterator.index + 2] !== 'o') ||
				(!rerollOnce && iterator.txt[iterator.index + 2] === 'o')) {
				break;
			}

			iterator.next();
			if (rerollOnce) {
				iterator.next();
			}

			conditions.push(this.processModifierComparePoint(iterator));

			current = iterator.peek();
		}

		return new ParserObjects.ReRoll(diceRoll, conditions, rerollOnce);
	}

	static processKeepDropModifier(iterator, diceRoll) {
		let current = iterator.next();
		if (current.value !== 'd' && current.value !== 'k') {
			throw new Error(`Expected explosion character at position ${iterator.index}`);
		}

		const isKeep = current.value === 'k';
		current = iterator.peek();

		let type;
		if (current.value === 'h') {
			type = KeepDropType.HIGH;
			iterator.next();
			current = iterator.peek();
		}
		else if (current.value === 'l') {
			type = KeepDropType.LOW;
			iterator.next();
			current = iterator.peek();
		}
		else {
			type = KeepDropType.SPECIFIC;
		}

		if (type === KeepDropType.SPECIFIC) {
			return this.processKeepDropSpecificList(iterator, diceRoll, isKeep);
		}

		const count = isIntChar(current.value) ? this.processInt(iterator) : 1;
		return new ParserObjects.KeepDropHighLow(diceRoll, type === KeepDropType.HIGH, isKeep, count);
	}

	static processKeepDropSpecificList(iterator, diceRoll, isKeep) {
		const conditions = [this.processModifierComparePoint(iterator)];

		let current = iterator.peek();
		while ((isKeep && current.value === 'k') ||
			(!isKeep && current.value === 'd')) {
			// Cheat the iterator a little so we can make sure we aren't mixing
			// in keep/drop high/low modifiers.
			if (iterator.txt[iterator.index + 2] == 'h' ||
				iterator.txt[iterator.index + 2] === 'l') {
				break;
			}

			iterator.next();
			conditions.push(this.processModifierComparePoint(iterator));

			current = iterator.peek();
		}

		return new ParserObjects.KeepDropConditional(diceRoll, conditions, isKeep);
	}

	static processListResolver(iterator, targetObject) {
		let currentChar = iterator.peek();
		if (currentChar.done) {
			return targetObject;
		}

		if (currentChar.value === 'm') {
			iterator.next();
			currentChar = iterator.peek();
			let matchCount = false;
			if (currentChar.value === 't') {
				matchCount = true;
				iterator.next();
			}

			return new ParserObjects.NumberMatcher(targetObject, matchCount);
		}

		if (isIntChar(currentChar.value) || CharacterSets.ComparePointOperators.indexOf(currentChar.value) >= 0) {
			const successFunc = this.processModifierComparePoint(iterator);
			let failFunc;
			currentChar = iterator.peek();
			if (currentChar.value === 'f') {
				iterator.next();
				failFunc = this.processModifierComparePoint(iterator);
			}

			return new ParserObjects.SuccessFailCounter(targetObject, successFunc, failFunc);
		}

		return targetObject;
	}

	static processInt(iterator) {
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

	static processComparePoint(iterator) {
		const typeChar = iterator.next();
		const num = this.processInt(iterator);

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

	static processModifierComparePoint(iterator) {
		if (isIntChar(iterator.peek().value)) {
			const num = this.processInt(iterator);
			return (value) => value === num;
		}

		return this.processComparePoint(iterator);
	}

	static isModifierComparePointChar(c) {
		return c !== undefined && (isIntChar(c) || CharacterSets.ComparePointOperators.indexOf(c) >= 0);
	}
}

function isIntChar(c) {
	return c !== undefined && (c === '-' || CharacterSets.Numbers.indexOf(c) >= 0);
}

function standardizeDiceString(str) {
	if (!str) return str;
	return str.replace(/\s+/g, '').toLowerCase();
}

module.exports = {
	ResolveDiceString,
	standardizeDiceString,
	DiceStringIterator,
	isIntChar,
	ProcessFunctions,
	carveMathString,
	MathFunction,
};