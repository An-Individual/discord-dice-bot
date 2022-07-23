const DiceFunctions = require('./dice-functions');

const ParserResolveTypes = {
	DICE_ROLL: 1,
	NUMBER: 2,
	NUMBER_LIST: 3,
};

const ResolvedNumberType = {
	UNTYPED: 0,
	SUCCESS_FAIL: 1,
	MATCH_COUNT: 2,
};

class ResolvedNumber {
	constructor(value, text, type) {
		this.value = value;
		this.text = text;
		this.type = !type ? ResolvedNumberType.UNTYPED : type;
	}

	discard() {
		this.text = addDiscardedFormatting(this.text);
		this.discarded = true;
	}
}

// All objects in the tree that the parser ultimately produces
// are ParserObjects
class ParserObject {
	getResolveType() {
		throw new Error('getType() has not been implemented');
	}

	resolve() {
		throw new Error('resolve() has not been implemented');
	}

	testResolveType(parserObject, types) {
		if (types.indexOf(parserObject.getResolveType()) < 0) {
			throw new Error(`${this.constructor.name} does not support operating on ${parserObject.constructor.name}`);
		}
	}
}

// Operator objects are a class of parser objects that operate
// on a single child parser object.
class ParserOperatorObject extends ParserObject {
	constructor(child) {
		super();
		this.child = child;
	}
}

class DiceRoll extends ParserObject {
	constructor(numDice, numSides, minValue) {
		super();
		this.numDice = numDice;
		this.numSides = numSides;
		this.minValue = !minValue ? 1 : minValue;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker) {
		tracker.notifyNewDice(this.numDice);
		return DiceFunctions.rollDice(this.numDice, this.minValue, this.numSides);
	}
}

class CustomDiceRoll extends ParserObject {
	constructor(numDice, sides) {
		super();
		this.numDice = numDice;
		this.sides = sides;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker) {
		tracker.notifyNewDice(this.numDice);
		return DiceFunctions.rollCustomDice(this.numDice, this.sides);
	}
}

class StaticNumber extends ParserObject {
	constructor(value) {
		super();
		this.value = value;
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve() {
		return new ResolvedNumber(this.value, this.value.toString());
	}
}

class DiceExplosionRegular extends ParserOperatorObject {
	constructor(dice, condition) {
		super(dice);
		this.condition = condition;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker);

		for (let i = 0; i < roll.length; i++) {
			if (!roll[i].maxVal) {
				throw new Error('Explode function not supported for custom dice.');
			}

			if (roll[i].discarded) {
				continue;
			}

			for (let y = 0; y < roll[i].rolls.length; y++) {
				if ((!this.condition && roll[i].rolls[y] >= roll[i].maxVal) ||
					(this.condition && this.condition(roll[i].rolls[y]))) {
					tracker.notifyNewDice(1);
					this.addExplosion(roll[i], roll);
				}
			}
		}

		return roll;
	}

	addExplosion(die, roll) {
		die.exploded = true;
		const newDie = die.getUnrolledCopy();
		newDie.addRoll();
		roll.push(newDie);
	}
}

class DiceExplosionCompounding extends ParserOperatorObject {
	constructor(dice, condition) {
		super(dice);
		this.condition = condition;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker);

		for (let i = 0; i < roll.length; i++) {
			if (!roll[i].maxVal) {
				throw new Error('Explode function not supported for custom dice.');
			}

			if (roll[i].discarded) {
				continue;
			}

			while ((!this.condition && roll[i].rolls[roll[i].rolls.length - 1] >= roll[i].maxVal) ||
				(this.condition && this.condition(roll[i].rolls[roll[i].rolls.length - 1]))) {
				tracker.notifyNewDice(1);
				roll[i].exploded = true;
				roll[i].addRoll();
			}
		}

		return roll;
	}
}

class DiceExplosionPenetrating extends ParserOperatorObject {
	constructor(dice, condition) {
		super(dice);
		this.condition = condition;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker);

		for (let i = 0; i < roll.length; i++) {
			if (!roll[i].maxVal) {
				throw new Error('Explode function not supported for custom dice.');
			}

			if (roll[i].discarded) {
				continue;
			}

			if ((!this.condition && roll[i].rolls[0] >= roll[i].maxVal) ||
				(this.condition && this.condition(roll[i].rolls[0]))) {
				tracker.notifyNewDice(1);
				this.addExplosion(roll[i], roll);
			}
		}

		return roll;
	}

	addExplosion(die, roll) {
		die.exploded = true;
		const newDie = die.getUnrolledCopy();
		newDie.addRoll();
		newDie.addResult(-1);
		roll.push(newDie);
	}
}

class ReRoll extends ParserOperatorObject {
	constructor(dice, conditions, onlyOnce) {
		super(dice);
		this.conditions = conditions;
		this.onlyOnce = onlyOnce;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker);

		const initialDiceCount = roll.length;
		for (let i = 0; i < (this.onlyOnce ? initialDiceCount : roll.length); i++) {
			if (roll[i].discarded) {
				continue;
			}

			if (this.conditionMatches(roll[i].value)) {
				tracker.notifyNewDice(1);
				roll[i].discard();
				const newRoll = roll[i].getUnrolledCopy();
				newRoll.addRoll();
				roll.push(newRoll);
			}
		}

		return roll;
	}

	conditionMatches(value) {
		for (let i = 0; i < this.conditions.length; i++) {
			if (this.conditions[i](value)) {
				return true;
			}
		}

		return false;
	}
}

class KeepDropConditional extends ParserOperatorObject {
	constructor(child, conditions, isKeep) {
		super(child);
		this.conditions = conditions;
		this.isKeep = isKeep;
	}

	getResolveType() {
		return this.child.getResolveType() === ParserResolveTypes.DICE_ROLL ? ParserResolveTypes.DICE_ROLL : ParserResolveTypes.NUMBER_LIST;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		const values = this.child.resolve(tracker);

		const initialDiceCount = values.length;
		for (let i = 0; i < (this.onlyOnce ? initialDiceCount : values.length); i++) {
			if (values[i].discarded) {
				continue;
			}

			if ((this.isKeep && !this.conditionMatches(values[i].value)) ||
				((!this.isKeep && this.conditionMatches(values[i].value)))) {
				values[i].discard();
			}
		}

		return values;
	}

	conditionMatches(value) {
		for (let i = 0; i < this.conditions.length; i++) {
			if (this.conditions[i](value)) {
				return true;
			}
		}

		return false;
	}
}

class KeepDropHighLow extends ParserOperatorObject {
	constructor(child, isHigh, isKeep, count) {
		super(child);
		this.isHigh = isHigh;
		this.isKeep = isKeep;
		this.count = count;
	}

	getResolveType() {
		return this.child.getResolveType() === ParserResolveTypes.DICE_ROLL ? ParserResolveTypes.DICE_ROLL : ParserResolveTypes.NUMBER_LIST;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		const values = this.child.resolve(tracker);

		const valuesCopy = values.slice();
		if (this.isHigh) {
			valuesCopy.sort((a, b) => b.value - a.value);
		}
		else {
			valuesCopy.sort((a, b) => a.value - b.value);
		}

		let interactCount = 0;
		for (let i = 0; i < valuesCopy.length; i++) {
			if (interactCount < this.count) {
				if (!valuesCopy[i].discarded) {
					interactCount++;
					if (!this.isKeep) {
						valuesCopy[i].discard();
					}
				}
			}
			else if (this.isKeep) {
				valuesCopy[i].discard();
			}
		}

		return values;
	}
}

class NumberMatcher extends ParserOperatorObject {
	constructor(child, resolveToMatchCount) {
		super(child);
		this.resolveToMatchCount = resolveToMatchCount;
	}

	getResolveType() {
		return ParserResolveTypes.MATCH_COUNT;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		let values = this.child.resolve(tracker);

		if (this.child.getResolveType() == ParserResolveTypes.DICE_ROLL) {
			values = resolveDiceToNumberList(values);
		}

		const valueTracker = [];
		const discarded = [];
		for (let i = 0; i < values.length; i++) {
			if (values[i].discarded) {
				discarded.push(values[i]);
			}
			else if (!valueTracker[values[i].value]) {
				valueTracker[values[i].value] = {
					numObjects: [values[i]],
					count: 1,
				};
			}
			else {
				valueTracker[values[i].value].numObjects.push(values[i]);
				valueTracker[values[i].value].count++;
			}
		}

		valueTracker.sort((a, b) => {
			let dif = b.count - a.count;
			if (dif === 0) {
				dif = b.numObjects[0].value - a.numObjects[0].value;
			}
			return dif;
		});

		values = valueTracker.map(v => v.numObjects).reduce((a, b) => a.concat(b));
		values = values.concat(discarded);

		const text = buildNumberListString(values);
		let resultValue;
		let resultType = ResolvedNumberType.UNTYPED;
		if (this.resolveToMatchCount) {
			resultValue = valueTracker.filter(t => t.count > 1).length;
			resultType = ResolvedNumberType.MATCH_COUNT;
		}
		else {
			resultValue = values.map(v => v.discarded ? 0 : v.value).reduce((a, b) => a + b);
		}

		return new ResolvedNumber(resultValue, text, resultType);
	}
}

class SuccessFailCounter extends ParserOperatorObject {
	constructor(child, successFunc, failureFunc) {
		super(child);
		this.successFunc = successFunc;
		this.failureFunc = failureFunc;
	}

	getResolveType() {
		return ParserResolveTypes.SUCCESS_FAILURE;
	}

	resolve(tracker) {
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		let values = this.child.resolve(tracker);

		let childWasDice = false;
		if (this.child.getResolveType() == ParserResolveTypes.DICE_ROLL) {
			values = resolveDiceToNumberList(values);
			childWasDice = true;
		}

		let total = 0;
		for (let i = 0; i < values.length; i++) {
			if (values[i].discarded) {
				continue;
			}
			if (this.successFunc(values[i].value)) {
				if (childWasDice) {
					values[i].text = addSuccessFormatting(values[i].text);
				}
				total++;
			}
			else if (this.failureFunc && this.failureFunc(values[i].value)) {
				if (childWasDice) {
					values[i].text = addFailureFormatting(values[i].text);
				}
				total--;
			}
		}

		const text = buildNumberListString(values);
		const result = new ResolvedNumber(total, text, ResolvedNumberType.SUCCESS_FAIL);

		return result;
	}
}

class Bracket extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return this.child.getResolveType();
	}

	resolve(tracker) {
		const result = this.child.resolve(tracker);

		if (result.text) {
			result.text = `(${result.text})`;
		}

		return result;
	}
}

class NumberList extends ParserObject {
	constructor(entries) {
		super();
		this.entries = entries;
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER_LIST;
	}

	resolve(tracker) {
		const result = [];

		for (let i = 0; i < this.entries.length; i++) {
			result.push(resolveToNumber(this.entries[i].resolve(tracker)));
		}

		return result;
	}
}

class Floor extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker) {
		let result = this.child.resolve(tracker);
		result = resolveToNumber(result);

		result.text = `floor(${result.text})`;
		result.value = Math.floor(result.value);

		return result;
	}
}

class Ceiling extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker) {
		let result = this.child.resolve(tracker);
		result = resolveToNumber(result);

		result.text = `ceil(${result.text})`;
		result.value = Math.ceil(result.value);

		return result;
	}
}

class Round extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker) {
		let result = this.child.resolve(tracker);
		result = resolveToNumber(result);

		result.text = `round(${result.text})`;
		result.value = Math.round(result.value);

		return result;
	}
}

class Absolute extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker) {
		let result = this.child.resolve(tracker);
		result = resolveToNumber(result);

		result.text = `abs(${result.text})`;
		result.value = Math.abs(result.value);

		return result;
	}
}

class MathParserObject extends ParserObject {
	constructor(left, right) {
		super();
		this.left = left;
		this.right = right;
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	getLeft(tracker) {
		if (!this.left) {
			throw new Error('Unknown syntax error');
		}

		return resolveToNumber(this.left.resolve(tracker));
	}

	getRight(tracker) {
		if (!this.right) {
			throw new Error('Unknown syntax error');
		}

		return resolveToNumber(this.right.resolve(tracker));
	}

	buildResult(leftNum, rightNum, char) {
		const txt = `${leftNum.text} ${char} ${rightNum.text}`;
		const type = leftNum.type === rightNum.type ? leftNum.type : ResolvedNumberType.UNTYPED;
		return new ResolvedNumber(0, txt, type);
	}
}

class MathAdd extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	getResolveType() {
		if (this.left.getResolveType() === ParserResolveTypes.DICE_ROLL &&
			this.right.getResolveType() === ParserResolveTypes.DICE_ROLL) {
			return ParserResolveTypes.DICE_ROLL;
		}

		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker) {
		// Add skips the helper functions so it can handle dice collections.
		const leftRes = this.left.resolve(tracker);
		const rightRes = this.right.resolve(tracker);

		if (this.getResolveType() === ParserResolveTypes.DICE_ROLL) {
			return leftRes.concat(rightRes);
		}

		const leftNum = resolveToNumber(leftRes);
		const rightNum = resolveToNumber(rightRes);

		const result = this.buildResult(leftNum, rightNum, '+');
		result.value = leftNum.value + rightNum.value;
		return result;
	}
}

class MathSubtract extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker) {
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker);
		const rightNum = this.getRight(tracker);

		const result = this.buildResult(leftNum, rightNum, '-');
		result.value = leftNum.value - rightNum.value;
		return result;
	}
}

class MathMultiply extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker) {
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker);
		const rightNum = this.getRight(tracker);

		const result = this.buildResult(leftNum, rightNum, '\\*');
		result.value = leftNum.value * rightNum.value;
		return result;
	}
}

class MathDivide extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker) {
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker);
		const rightNum = this.getRight(tracker);

		const result = this.buildResult(leftNum, rightNum, '/');
		result.value = leftNum.value / rightNum.value;
		return result;
	}
}

class MathModulo extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker) {
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker);
		const rightNum = this.getRight(tracker);

		const result = this.buildResult(leftNum, rightNum, '%');
		result.value = leftNum.value % rightNum.value;
		return result;
	}
}

class MathExponent extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker) {
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker);
		const rightNum = this.getRight(tracker);

		const result = this.buildResult(leftNum, rightNum, '^');
		result.value = leftNum.value ** rightNum.value;
		return result;
	}
}

function resolveToNumber(object) {
	// If it's already just a number return it.
	if (object instanceof ResolvedNumber) {
		return object;
	}

	// If it's an empty list throw an exception.
	if (!object.length) {
		throw new Error('Unknown syntax error');
	}

	// If it's a dice list turn it into a number list.
	if (object[0] instanceof DiceFunctions.DieResult) {
		object = resolveDiceToNumberList(object);
	}

	// If it's a number list sum the numbers into a single number.
	if (object[0] instanceof ResolvedNumber) {
		const txt = object.length === 1 ? object[0].text : `(${object.map(o => o.text).join(' + ')})`;
		const value = object.map(o => o.discarded ? 0 : o.value).reduce((c, v) => c + v);

		return new ResolvedNumber(value, txt);
	}

	// If we get here something mysterious has gone wrong.
	throw new Error('Unknown syntax error');
}

function resolveDiceToNumberList(dice) {
	return dice.map(d => {
		const result = new ResolvedNumber(d.value, getDieString(d));
		result.discarded = d.discarded;
		return result;
	});
}

function buildNumberListString(numbers, joinString) {
	if (!numbers) {
		return '';
	}

	joinString = !joinString ? ' + ' : joinString;

	if (numbers.length === 1) {
		return numbers[0].text;
	}

	return `(${numbers.map(v => v.text).join(joinString)})`;
}

function getDieString(die) {
	let numString = '[' + die.rolls[0].toString();
	for (let i = 1; i < die.rolls.length; i++) {
		if (die.rolls[i] >= 0) {
			numString += '+';
		}
		numString += die.rolls[i].toString();
	}

	if (die.rolls.length > 1) {
		numString += '=' + die.value;
	}

	numString += ']';

	if (die.discarded) {
		numString = addDiscardedFormatting(numString);
	}

	if (die.exploded) {
		numString = addExplodeFormatting(numString);
	}

	return numString;
}

function addDiscardedFormatting(text) {
	if (!text) {
		return text;
	}

	return `~~${text.replace(/~~/g, '')}~~`;
}

function addExplodeFormatting(text) {
	if (!text) {
		return text;
	}

	return `**${text}**`;
}

function addSuccessFormatting(text) {
	if (!text) {
		return text;
	}

	return `__${text}__`;
}

function addFailureFormatting(text) {
	if (!text) {
		return text;
	}

	return `*${text}*`;
}

module.exports = {
	ParserResolveTypes,
	ResolvedNumberType,
	ResolvedNumber,
	DiceRoll,
	CustomDiceRoll,
	StaticNumber,
	DiceExplosionRegular,
	DiceExplosionCompounding,
	DiceExplosionPenetrating,
	ReRoll,
	KeepDropConditional,
	KeepDropHighLow,
	NumberMatcher,
	SuccessFailCounter,
	Bracket,
	NumberList,
	Floor,
	Ceiling,
	Round,
	Absolute,
	MathAdd,
	MathSubtract,
	MathMultiply,
	MathDivide,
	MathModulo,
	MathExponent,
	resolveToNumber,
};