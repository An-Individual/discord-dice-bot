const Errors = require('../parser.errors');
const ParserObjects = require('../resolution/parser.resolution.objects');
const { KeepDropType, CharacterSets } = require('../parser.constants');
const { processInt, isIntChar } = require('./parser.processing.numbers');
const { processModifierComparePoint, isModifierComparePointChar } = require('./parser.processing.compare-points');

/**
 * Parses a dice string from the iterator including any modifiers and
 * resolves that wrap it based on the characters that follow the 'dN' format.
 * Example: 'd20!>4'
 * @param {DiceIterator} iterator An iterator at the 'd' that represents
 * the start of a dice string.
 * @param {Number} numDice The number of dice from right before the string.
 * @returns A ParserObject that resolves to either a dice roll or a
 * number depending on whether or not the string includes a resolver.
 */
function processDice(iterator, numDice) {
	const coreDice = processSimpleDiceString(iterator, numDice);

	// The modifier loop needs to invert the wrappers as it goes
	// so that the modifiers will execute in the order they appear
	// instead of the reverse order.
	let lastDice = coreDice;
	let outerDice = coreDice;
	let lastIdx;
	do {
		lastIdx = iterator.index;
		const newDice = processRollModifier(iterator, coreDice);
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

	outerDice = processListResolver(iterator, outerDice);

	Errors.throwIfNotDone(iterator.next());
	return outerDice;
}

/**
 * Handles the 'dN' part of the dice string.
 * Example: 'd20'
 * @param {DiceIterator} iterator An iterator at the 'd' that represents
 * the start of a dice string.
 * @param {Number} numDice The number of dice from right before the string.
 * @returns A DiceRoll ProcessorObject read from the iterator.
 */
function processSimpleDiceString(iterator, numDice) {
	let current = iterator.next();

	Errors.throwIfDone(current.done);
	if (current.value != 'd') {
		throw new Error(`Expected character 'd' at position ${iterator.index}`);
	}

	current = iterator.peek();
	if (isIntChar(current.value)) {
		const dieSize = processInt(iterator);

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

/**
 * Attempts to read a ParserObject that modifies a dice roll from
 * the iterator. Is a no-op if the iterator is not at one.
 * Examples: '!', 'r>4', 'kh2'
 * @param {DiceStringIterator} iterator An iterator at the start of a
 * dice roll modifier. Is a no-op of not.
 * @param {*} diceRoll The ParserObject to wrap in a modifier if one is
 * discovered.
 * @returns Either the input ParserObject or a new ParserObject wrapping
 * the input.
 */
function processRollModifier(iterator, diceRoll) {
	const current = iterator.peek();

	if (current.value === '!') {
		return processExplosionModifier(iterator, diceRoll);
	}
	else if (current.value === 'r') {
		return processRerollModifier(iterator, diceRoll);
	}
	else if (current.value === 'k' || current.value === 'd') {
		return processKeepDropModifier(iterator, diceRoll);
	}

	return diceRoll;
}

/**
 * Reads an explosion modifier out of the iterator. Throws an error
 * if one isn't there.
 * Examples: '!', '!!>5', '!p'
 * @param {DiceStringIterator} iterator An iterator pointing at the start
 * of an explosion modifier
 * @param {*} diceRoll The ParserObject to wrap the explosion modifier in.
 * @returns A ParserObject that will explode the dice from the input ParserObject.
 */
function processExplosionModifier(iterator, diceRoll) {
	if (iterator.next().value !== '!') {
		throw new Error(`Expected explosion character at position ${iterator.index}`);
	}
	let current = iterator.peek();
	if (current.value === '!') {
		iterator.next();
		current = iterator.peek();
		let compare;
		if (isModifierComparePointChar(current.value)) {
			compare = processModifierComparePoint(iterator);
		}
		return new ParserObjects.DiceExplosionCompounding(diceRoll, compare);
	}
	else if (current.value === 'p') {
		iterator.next();
		current = iterator.peek();
		let compare;
		if (isModifierComparePointChar(current.value)) {
			compare = processModifierComparePoint(iterator);
		}
		return new ParserObjects.DiceExplosionPenetrating(diceRoll, compare);
	}
	else {
		let compare;
		if (isModifierComparePointChar(current.value)) {
			compare = processModifierComparePoint(iterator);
		}
		return new ParserObjects.DiceExplosionRegular(diceRoll, compare);
	}
}

/**
 * Reads a reroll modifier out of the iterator. Throws an error
 * if one isn't there.
 * Examples: 'ro1', 'r6r5r<3'
 * @param {DiceStringIterator} iterator An iterator pointing at the start
 * of an reroll modifier
 * @param {*} diceRoll The ParserObject to wrap the reroll modifier in.
 * @returns A ParserObject that will reroll the dice from the input ParserObject.
 */
function processRerollModifier(iterator, diceRoll) {
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
	conditions.push(processModifierComparePoint(iterator));

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

		conditions.push(processModifierComparePoint(iterator));

		current = iterator.peek();
	}

	return new ParserObjects.ReRoll(diceRoll, conditions, rerollOnce);
}

/**
 * Reads either a KeepDropSpecific or KeepDropHighLow modifier out of the
 * iterator. Throws an error if one isn't there.
 * Examples: 'd4d2d>5', 'kh', 'dl3'
 * @param {DiceStringIterator} iterator An iterator pointing at the start
 * of an keep or drop modifier.
 * @param {*} diceRoll The ParserObject to wrap the resulting modifier in.
 * @returns A ParserObject that will discard dice based on the type and
 * conditions of the modifier read out of the iterator.
 */
function processKeepDropModifier(iterator, diceRoll) {
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
		return processKeepDropSpecificList(iterator, diceRoll, isKeep);
	}

	const count = isIntChar(current.value) ? processInt(iterator) : 1;
	return new ParserObjects.KeepDropHighLow(diceRoll, type === KeepDropType.HIGH, isKeep, count);
}

/**
 * A helper method for processKeepDropModifier(). Handles the fact that you can chain
 * 'd' and 'k' commands in a row to combine conditions.
 * Examples: '>3', '4d6', '>5k2k3'
 * @param {DiceStringIterator} iterator Iterator at the first condition for a keep or drop
 * specific command.
 * @param {*} diceRoll The ParserObject to wrap the resulting modifier in.
 * @param {*} isKeep True if the lead in character was a 'k' for keep. False if it was a 'd' for drop.
 * @returns A KeepDropSpecific modifier wrapping the input ParserObject.
 */
function processKeepDropSpecificList(iterator, diceRoll, isKeep) {
	const conditions = [processModifierComparePoint(iterator)];

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
		conditions.push(processModifierComparePoint(iterator));

		current = iterator.peek();
	}

	return new ParserObjects.KeepDropConditional(diceRoll, conditions, isKeep);
}

/**
 * Attempts to read a resolver from the iterator and wrap the target ParserObject in it.
 * Resolvers modify lists of dice or numbers into a single number, usually via a method
 * other than the summation method used by default. This is a no-op if no resolver
 * is found.
 * Examples: 'm', 'mt', '>4', '>5f1'
 * @param {DiceStringIterator} iterator An iterator at the start of a resolver.
 * @param {ParserObject} targetObject The ParserObject to wrap if a resolver is discovered.
 * @returns Either the input ParserObject or a resolver ParserObject wrapping the input
 * Parser Object.
 */
function processListResolver(iterator, targetObject) {
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
		const successFunc = processModifierComparePoint(iterator);
		let failFunc;
		currentChar = iterator.peek();
		if (currentChar.value === 'f') {
			iterator.next();
			failFunc = processModifierComparePoint(iterator);
		}

		return new ParserObjects.SuccessFailCounter(targetObject, successFunc, failFunc);
	}

	return targetObject;
}

module.exports = {
	processDice,
	processListResolver,
	processKeepDropModifier,
	// Testing Exports
	processSimpleDiceString,
	processRollModifier,
	processExplosionModifier,
	processRerollModifier,
};