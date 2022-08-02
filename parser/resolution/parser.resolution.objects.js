const DiceFunctions = require('../parser.dice-functions');
const { ParserResolveTypes, ResolvedNumberType } = require('../parser.constants');
const {
	ResolvedNumber,
	resolveToNumber,
	resolveDiceToNumberList,
	buildNumberListString,

} = require('./parser.resolution');

/**
 * Base object for all objects in the resolution tree.
 */
class ParserObject {
	/**
	 * Returns the ParserResolveType that the object resolves to.
	 */
	getResolveType() {
		throw new Error('getType() has not been implemented');
	}

	/**
	 * Resolves the object and any child objects into an object
	 * matching the type returned by getResolveType().
	 * @param {BaseDieCountTracker} tracker The tracker to keep track of how many dice have been rolled.
	 * @param {BaseFormatter} formatter The formatter used to apply text formatting.
	 * @returns An object based on its getResolveTye().
	 */
	resolve() {
		throw new Error('resolve() has not been implemented');
	}

	/**
	 * A helper method that tests whether or not the give oject resolves to
	 * one of the provided resolution types. Throws an error if it doesn't.
	 * @param {ParserObject} parserObject The ParserObject to test.
	 * @param {*} types A list of valid resolution types.
	 */
	testResolveType(parserObject, types) {
		if (types.indexOf(parserObject.getResolveType()) < 0) {
			throw new Error(`${this.constructor.name} does not support operating on ${parserObject.constructor.name}`);
		}
	}

	/**
	 * A helper method used to throw an error if the formatter isn't being
	 * passed through the tree properly.
	 */
	testFormatterProvided(formatter) {
		if (!formatter) {
			throw new Error('A formatter was not provided. This is a bug. Please report it :).');
		}
	}
}

/**
 * Subclass used by any ParserObject resolves a single
 * child ParserObject before operating on the results
 * and returning them. Primarily exists to ensure the
 * name of the property that tracks the child is consistent.
 */
class ParserOperatorObject extends ParserObject {
	constructor(child) {
		super();
		this.child = child;
	}
}

/**
 * Rolls the defined die when resolved.
 */
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

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		tracker.notifyNewDice(this.numDice);
		return DiceFunctions.rollDice(this.numDice, this.minValue, this.numSides);
	}
}

/**
 * Rolls the defined custom die when resolved.
 */
class CustomDiceRoll extends ParserObject {
	constructor(numDice, sides) {
		super();
		this.numDice = numDice;
		this.sides = sides;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		tracker.notifyNewDice(this.numDice);
		return DiceFunctions.rollCustomDice(this.numDice, this.sides);
	}
}

/**
 * Used to represent a static number in the resolution tree.
 */
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

/**
 * Applies the regular kind of dice explosion to a wrapped dice roll.
 * The regular explosion rolls new dice that rolled it's maximum value
 * and will continue to roll more dice as long as the newly rolled dice
 * continue to roll their maximum value.
 */
class DiceExplosionRegular extends ParserOperatorObject {
	constructor(dice, condition) {
		super(dice);
		this.condition = condition;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker, formatter);

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

/**
 * Applied a compounding explosion to a wrapped dice roll.
 * Compounding explosions work like regular explosions except that
 * the new rolls are added to the existing dice instead of
 * being represented by new rolls.
 */
class DiceExplosionCompounding extends ParserOperatorObject {
	constructor(dice, condition) {
		super(dice);
		this.condition = condition;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker, formatter);

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

/**
 * Applies a penetrating explosion to a wrapped dice roll.
 * A penetrating explosion works like a regular explosion
 * except that every newly rolled die has a -1 applied to
 * it's value. This is represented by adding a -1 result
 * to the newly rolled dice.
 */
class DiceExplosionPenetrating extends ParserOperatorObject {
	constructor(dice, condition) {
		super(dice);
		this.condition = condition;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker, formatter);

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

/**
 * Rerolls any dice in the wrapped roll that meet the
 * given conditions. Rerolls are represented by discarding
 * dice and adding freshly rolled dice so that the number
 * of rerolls is visible in the results.
 */
class ReRoll extends ParserOperatorObject {
	constructor(dice, conditions, onlyOnce) {
		super(dice);
		this.conditions = conditions;
		this.onlyOnce = onlyOnce;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL]);
		const roll = this.child.resolve(tracker, formatter);

		const initialDiceCount = roll.length;
		for (let i = 0; i < (this.onlyOnce ? initialDiceCount : roll.length); i++) {
			if (roll[i].discarded) {
				continue;
			}

			if (this.conditionMatches(roll[i].value)) {
				tracker.notifyNewDice(1);
				roll[i].discard(formatter);
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

/**
 * Discards dice or numbers from a wrapped dice roll or number
 * list based on the given condtion. Whether or not it keeps or
 * discards matches depends on whether or not it is defined as
 * a keep or drop modifier.
 */
class KeepDropConditional extends ParserOperatorObject {
	constructor(child, conditions, isKeep) {
		super(child);
		this.conditions = conditions;
		this.isKeep = isKeep;
	}

	getResolveType() {
		return this.child.getResolveType() === ParserResolveTypes.DICE_ROLL ? ParserResolveTypes.DICE_ROLL : ParserResolveTypes.NUMBER_LIST;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		const values = this.child.resolve(tracker, formatter);

		const initialDiceCount = values.length;
		for (let i = 0; i < (this.onlyOnce ? initialDiceCount : values.length); i++) {
			if (values[i].discarded) {
				continue;
			}

			if ((this.isKeep && !this.conditionMatches(values[i].value)) ||
				((!this.isKeep && this.conditionMatches(values[i].value)))) {
				values[i].discard(formatter);
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

/**
 * Discards a defined number of either the highest or lowest
 * values from a wrapped dice roll or number list.
 */
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

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		const values = this.child.resolve(tracker, formatter);

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
						valuesCopy[i].discard(formatter);
					}
				}
			}
			else if (this.isKeep) {
				valuesCopy[i].discard(formatter);
			}
		}

		return values;
	}
}

/**
 * Sorts a wrapped dice roll or number list so that
 * matches are easier to spot, prioritizing a greater
 * number of matchs over the number that was matched.
 * Optionaly it changes the result to a count of the
 * number of matches rather than simply summing them.
 */
class NumberMatcher extends ParserOperatorObject {
	constructor(child, resolveToMatchCount) {
		super(child);
		this.resolveToMatchCount = resolveToMatchCount;
	}

	getResolveType() {
		return ParserResolveTypes.MATCH_COUNT;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		let values = this.child.resolve(tracker, formatter);

		if (this.child.getResolveType() == ParserResolveTypes.DICE_ROLL) {
			values = resolveDiceToNumberList(values, formatter);
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

/**
 * Replaces the usual summing for a wrapped dice roll or number list
 * with a count of the number of values that match a given condition.
 * An optional failure count can be provided that decrements the result
 * for each value it matches.
 */
class SuccessFailCounter extends ParserOperatorObject {
	constructor(child, successFunc, failureFunc) {
		super(child);
		this.successFunc = successFunc;
		this.failureFunc = failureFunc;
	}

	getResolveType() {
		return ParserResolveTypes.SUCCESS_FAILURE;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		this.testResolveType(this.child, [ParserResolveTypes.DICE_ROLL, ParserResolveTypes.NUMBER_LIST]);
		let values = this.child.resolve(tracker, formatter);

		let childWasDice = false;
		if (this.child.getResolveType() == ParserResolveTypes.DICE_ROLL) {
			values = resolveDiceToNumberList(values, formatter);
			childWasDice = true;
		}

		let total = 0;
		for (let i = 0; i < values.length; i++) {
			if (values[i].discarded) {
				continue;
			}
			if (this.successFunc(values[i].value)) {
				values[i].text = formatter.addSuccessFormatting(values[i].text, childWasDice);
				total++;
			}
			else if (this.failureFunc && this.failureFunc(values[i].value)) {
				values[i].text = formatter.addFailureFormatting(values[i].text, childWasDice);
				total--;
			}
		}

		const text = buildNumberListString(values);
		const result = new ResolvedNumber(total, text, ResolvedNumberType.SUCCESS_FAIL);

		return result;
	}
}

/**
 * Simple resolver tree element that adds brackes to the
 * text of the object it's wrapping.
 */
class Bracket extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return this.child.getResolveType();
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		const result = this.child.resolve(tracker, formatter);

		if (result.text) {
			result.text = `(${result.text})`;
		}

		return result;
	}
}

/**
 * Wraps a list of ParserObjects which it resolves to
 * numbers and returns as a list of ResolvedNumbers.
 */
class NumberList extends ParserObject {
	constructor(entries) {
		super();
		this.entries = entries;
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER_LIST;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		const result = [];

		for (let i = 0; i < this.entries.length; i++) {
			result.push(resolveToNumber(this.entries[i].resolve(tracker, formatter), formatter));
		}

		return result;
	}
}

/**
 * Resolves a wrapped ParserObject to a ResolvedNumber
 * and converts the value to it's Floor value.
 */
class Floor extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		let result = this.child.resolve(tracker, formatter);
		result = resolveToNumber(result, formatter);

		result.text = `floor(${result.text})`;
		result.value = Math.floor(result.value);

		return result;
	}
}

/**
 * Resolves a wrapped ParserObject to a ResolvedNumber
 * and converts the value to it's Ceiling value.
 */
class Ceiling extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		let result = this.child.resolve(tracker, formatter);
		result = resolveToNumber(result, formatter);

		result.text = `ceil(${result.text})`;
		result.value = Math.ceil(result.value);

		return result;
	}
}

/**
 * Resolves a wrapped ParserObject to a ResolvedNumber
 * and converts the value to it's Rounded value.
 */
class Round extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		let result = this.child.resolve(tracker, formatter);
		result = resolveToNumber(result, formatter);

		result.text = `round(${result.text})`;
		result.value = Math.round(result.value);

		return result;
	}
}

/**
 * Resolves a wrapped ParserObject to a ResolvedNumber
 * and converts the value to it's Absolute value.
 */
class Absolute extends ParserOperatorObject {
	constructor(child) {
		super(child);
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		let result = this.child.resolve(tracker, formatter);
		result = resolveToNumber(result, formatter);

		result.text = `abs(${result.text})`;
		result.value = Math.abs(result.value);

		return result;
	}
}

/**
 * A base ParserObject for all ParserObjects that
 * represent math operations performed by resolving
 * two child ParserObjects, defined as being left and
 * right, into ResolvedNumbers and combines them using
 * a math operation.
 */
class MathParserObject extends ParserObject {
	constructor(left, right) {
		super();
		this.left = left;
		this.right = right;
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER;
	}

	/**
	 * Resolves the left object and any child objects into an object
	 * matching the type returned by getResolveType().
	 * @param {BaseDieCountTracker} tracker The tracker to keep track of how many dice have been rolled.
	 * @param {BaseFormatter} formatter The formatter used to apply text formatting.
	 * @returns An object based on its getResolveTye().
	 */
	getLeft(tracker, formatter) {
		if (!this.left) {
			throw new Error('Unknown syntax error');
		}

		return resolveToNumber(this.left.resolve(tracker, formatter), formatter);
	}

	/**
	 * Resolves the right object and any child objects into an object
	 * matching the type returned by getResolveType().
	 * @param {BaseDieCountTracker} tracker The tracker to keep track of how many dice have been rolled.
	 * @param {BaseFormatter} formatter The formatter used to apply text formatting.
	 * @returns An object based on its getResolveTye().
	 */
	getRight(tracker, formatter) {
		if (!this.right) {
			throw new Error('Unknown syntax error');
		}

		return resolveToNumber(this.right.resolve(tracker, formatter), formatter);
	}

	/**
	 * Helper method that creates a new ResolvedNumber based on the left
	 * and right numbers of a math operation and the given character
	 * representing the operation. Leaves the value of the result at 0
	 * to be filled in by the caller.
	 * @param {ResolvedNumber} leftNum The ResolvedNumber from the left side of the equation.
	 * @param {ResolvedNumber} rightNum Teh ResolvedNumber from the right side of the equation.
	 * @param {string} char The character representing the math operation.
	 * @returns A ResolvedNumber combining left and right with the value set to 0.
	 */
	buildResult(leftNum, rightNum, char) {
		const txt = `${leftNum.text} ${char} ${rightNum.text}`;
		const type = leftNum.type === rightNum.type ? leftNum.type : ResolvedNumberType.UNTYPED;
		return new ResolvedNumber(0, txt, type);
	}
}

/**
 * Adds the results of two ParserObjects together. If they both
 * resolve to dice rolls it concatonates those rolls into a single
 * list. Otherwise it resolves both of them to numbers.
 */
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

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		// Add skips the helper functions so it can handle dice collections.
		const leftRes = this.left.resolve(tracker, formatter);
		const rightRes = this.right.resolve(tracker, formatter);

		if (this.getResolveType() === ParserResolveTypes.DICE_ROLL) {
			return leftRes.concat(rightRes);
		}

		const leftNum = resolveToNumber(leftRes, formatter);
		const rightNum = resolveToNumber(rightRes, formatter);

		const result = this.buildResult(leftNum, rightNum, '+');
		result.value = leftNum.value + rightNum.value;
		return result;
	}
}

/**
 * Resolves two ParserObjects to numbers and subtracts them.
 */
class MathSubtract extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker, formatter);
		const rightNum = this.getRight(tracker, formatter);

		const result = this.buildResult(leftNum, rightNum, '-');
		result.value = leftNum.value - rightNum.value;
		return result;
	}
}

/**
 * Resolves two ParserObjects to numbers and multiplies them.
 */
class MathMultiply extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker, formatter);
		const rightNum = this.getRight(tracker, formatter);

		const result = this.buildResult(leftNum, rightNum, '\\*');
		result.value = leftNum.value * rightNum.value;
		return result;
	}
}

/**
 * Resolves two ParserObjects to numbers and divides the left by the right.
 */
class MathDivide extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker, formatter);
		const rightNum = this.getRight(tracker, formatter);

		const result = this.buildResult(leftNum, rightNum, '/');
		result.value = leftNum.value / rightNum.value;
		return result;
	}
}

/**
 * Resolves two ParserObjects to numbers and takes the modulo of the left with the right.
 */
class MathModulo extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker, formatter);
		const rightNum = this.getRight(tracker, formatter);

		const result = this.buildResult(leftNum, rightNum, '%');
		result.value = leftNum.value % rightNum.value;
		return result;
	}
}

/**
 * Resolves two ParserObjects to numbers and raises the left to the power of the right.
 */
class MathExponent extends MathParserObject {
	constructor(left, right) {
		super(left, right);
	}

	resolve(tracker, formatter) {
		this.testFormatterProvided(formatter);
		// Add skips the helper functions so it can handle dice collections.
		const leftNum = this.getLeft(tracker, formatter);
		const rightNum = this.getRight(tracker, formatter);

		const result = this.buildResult(leftNum, rightNum, '^');
		result.value = leftNum.value ** rightNum.value;
		return result;
	}
}

module.exports = {
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
};