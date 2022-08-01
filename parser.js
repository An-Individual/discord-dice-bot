const ParserObjects = require('./parser-objects');
const { KeepDropType, FunctionNames, FunctionList, CharacterSets } = require('./parser.constants.js');

function ResolveDiceString(input, tracker) {
	// Standardization ensures that the parser isn't
	// tripped up by variations in white space or capitalization
	input = standardizeDiceString(input);

	// Carve and fold the string into an intermediate hierarchy that will
	// make transforming it into processing objects that execute in the
	// correct order much easier.
	const iterator = new DiceStringIterator(input);
	const carvedHierarchy = CarvingFunctions.carveDiceStringByBrackets(iterator);

	// Process the hiearchy we carved in the previous step into a set
	// of objects that can actually execute the string.
	const baseResolver = ProcessFunctions.processGeneral(carvedHierarchy);

	// Finally resolve the string into its result.
	let result = baseResolver.resolve(tracker);

	// Ensure the result is single number.
	result = ParserObjects.resolveToNumber(result);

	return result;
}

class CarvingFunctions {
	static carveDiceStringByBrackets(iterator, isList, requiredTerminationChars) {
		const result = new Brackets(isList);

		if (isList) {
			let entry;
			do {
				entry = this.carveDiceStringByBrackets(iterator, false, '},');
				if (entry.elements.length > 0) {
					result.elements.push(entry);
				}
				throwIfDone(!entry.terminatingChar);
				if (entry.terminatingChar !== ',' && entry.terminatingChar !== '}') {
					throwUnexpectedChar(entry.terminatingChar);
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
					funcTxt = this.checkForFunction(currentElementTxt);
					if (funcTxt) {
						currentElementTxt = currentElementTxt.slice(0, -1 * funcTxt.length);
					}
				}

				if (currentElementTxt) {
					result.elements.push(carveMathString(currentElementTxt, result.elements.length > 0));
					currentElementTxt = '';
				}

				const childIsList = currentChar.value === '{';
				const bracketContent = this.carveDiceStringByBrackets(iterator, childIsList, childIsList ? '}' : ')');
				bracketContent.functionName = funcTxt;

				if (bracketContent.isList) {
					bracketContent.modifierSuffix = this.readListModifierCharacters(iterator);
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

		result.elements = this.foldAdjacentObjectsIntoMathFuncs(result.elements);

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

	static checkForFunction(elementTxt) {
		for (let i = 0; i < FunctionList.length; i++) {
			if (elementTxt.endsWith(FunctionList[i])) {
				return FunctionList[i];
			}
		}

		return '';
	}

	static readListModifierCharacters(iterator) {
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

	static foldAdjacentObjectsIntoMathFuncs(elements) {
		const result = [];

		for (let i = 0; i < elements.length; i++) {
			if (i === 0) {
				result.push(elements[i]);
				continue;
			}

			let mathInvolved = false;
			let emptyRight;
			if (result[result.length - 1] instanceof MathFunction) {
				mathInvolved = true;
				emptyRight = this.getMathFuncWithEmptyRightSlot(result[result.length - 1]);
			}

			let emptyLeft;
			if (elements[i] instanceof MathFunction) {
				mathInvolved = true;
				emptyLeft = this.getMathFuncWithEmptyLeftSlot(elements[i]);
			}

			if (mathInvolved) {
				if (emptyRight && !emptyLeft) {
					emptyRight.right = elements[i];
				}
				else if (!emptyRight && emptyLeft) {
					emptyLeft.left = result.pop();
					result.push(elements[i]);
				}
				else {
					// Either we have 2 math functions both looking to consume
					// their neighbor or 2 unlinked math functions, both of which
					// imply a syntax issue of some kind.
					throw new Error('Math syntax error');
				}
			}
			else {
				result.push(elements[i]);
			}
		}

		return result;
	}

	static getMathFuncWithEmptyLeftSlot(func) {
		if (func instanceof MathFunction && !func.left) {
			return func;
		}

		if (func.left instanceof MathFunction) {
			const leftCheck = this.getMathFuncWithEmptyLeftSlot(func.left);
			if (leftCheck) {
				return leftCheck;
			}
		}

		if (func.right instanceof MathFunction) {
			const rightCheck = this.getMathFuncWithEmptyLeftSlot(func.right);
			if (rightCheck) {
				return rightCheck;
			}
		}

		return;
	}

	static getMathFuncWithEmptyRightSlot(func) {
		if (!func.right) {
			return func;
		}

		if (func.right instanceof MathFunction) {
			const rightCheck = this.getMathFuncWithEmptyRightSlot(func.right);
			if (rightCheck) {
				return rightCheck;
			}
		}

		if (func.left instanceof MathFunction) {
			const leftCheck = this.getMathFuncWithEmptyRightSlot(func.left);
			if (leftCheck) {
				return leftCheck;
			}
		}

		return;
	}
}

function carveMathString(text, beforeBracket) {
	return carveMathByCharacters(text, '+-', carveMathMultDivMod, (idx) => {
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

		return CharacterSets.MathOperators.indexOf(text[idx - 1]) >= 0;
	});
}

function carveMathMultDivMod(text) {
	return carveMathByCharacters(text, '*/%', carveMathExponentiation);
}

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

function carveMathByCharacters(text, splitterCharacters, subSplitFunc, ignoreFunc) {
	const dividedTxt = splitStringOnCharacters(text, splitterCharacters, ignoreFunc);

	if (dividedTxt.length === 0) {
		return text;
	}

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

class Brackets {
	constructor(isList) {
		this.elements = [];
		this.isList = isList;
		this.functionName = '';
		this.modifierSuffix = '';
	}
}

class MathFunction {
	constructor(symbol, left, right) {
		this.symbol = symbol;
		this.left = left;
		this.right = right;
	}
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
			throwIfNotDone(iterator.peek());
			return object;
		}

		if (current.value === 'd' || current.value === 'k') {
			object = this.processKeepDropModifier(iterator, object);
			throwIfNotDone(iterator.peek());
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
		throwIfDone(current.done);

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

			throwIfNotDone(iterator.next());
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

			throwIfNotDone(iterator.next());
			return outerDice;
		}

		// Otherwise it's just an integer
		throwIfNotDone(iterator.next());
		return new ParserObjects.StaticNumber(num);
	}

	static processSimpleDiceString(iterator, numDice) {
		let current = iterator.next();

		throwIfDone(current.done);
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

		throwIfDone(current.done);
		throwUnexpectedChar(current.value);
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

		throwIfDone(peek.done);
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

function throwIfDone(done) {
	if (done) {
		throw new Error('Unexpected end of dice string');
	}
}

function throwIfNotDone(iteratorLocation) {
	if (!iteratorLocation.done) {
		throw new Error(`Unexpected character "${iteratorLocation.value}"`);
	}
}

function throwUnexpectedChar(char) {
	throw new Error(`Encountered unexpected character '${char}'`);
}

function isIntChar(c) {
	return c !== undefined && (c === '-' || CharacterSets.Numbers.indexOf(c) >= 0);
}

function standardizeDiceString(str) {
	if (!str) return str;
	return str.replace(/\s+/g, '').toLowerCase();
}

const DiceStringIterator = class {
	constructor(text) {
		this.txt = text;
		this.index = -1;
	}

	next() {
		this.index++;
		if (!this.txt || this.txt.length <= this.index) {
			return {
				done: true,
			};
		}
		else {
			return {
				value: this.txt[this.index],
			};
		}
	}

	peek() {
		if (!this.txt || this.txt.length <= this.index + 1) {
			return {
				done: true,
			};
		}
		else {
			return {
				value: this.txt[this.index + 1],
			};
		}
	}
};

module.exports = {
	ResolveDiceString,
	standardizeDiceString,
	DiceStringIterator,
	isIntChar,
	CarvingFunctions,
	ProcessFunctions,
	carveMathString,
	MathFunction,
	Brackets,
};