/**
 * Rolls one or more dice with custom faces.
 * @param {Number} num The number of dice to roll.
 * @param {Number[]} valueRange An array containing the values for each die face.
 * @returns An array of CustomDieResults for the rolled dice.
 */
function rollCustomDice(num, valueRange) {
	return rollDiceWithFunc(num, () => new CustomDieResult(valueRange));
}

/**
 * Rolls one or more dice.
 * @param {Number} num The number of dice to roll
 * @param {Number} minVal The lowest die value
 * @param {Number} maxVal The highest die value
 * @returns An array of DieResults for the rolled dice.
 */
function rollDice(num, minVal, maxVal) {
	return rollDiceWithFunc(num, () => new DieResult(minVal, maxVal));
}

/**
 * A helper function to avoid code duplication between rollDice
 * and rollCustomDice.
 * @param {*} num The number of dice to roll.
 * @param {*} dieBuilderFunc A function to create a new die result.
 * @returns An array of rolled die results created by the given dieBuilderFunc.
 */
function rollDiceWithFunc(num, dieBuilderFunc) {
	const result = [];

	for (let i = 0; i < num; i++) {
		const die = dieBuilderFunc();
		die.addRoll();
		result[i] = die;
	}

	return result;
}

/**
 * Helper method that generates a random number within a given
 * value range with equal weight given to each possible number.
 * @param {Number} minVal The lowest possible value to return.
 * @param {Number} maxVal The highest possible value to return.
 * @returns A random number between minVal and maxVal.
 */
function getRandomInRange(minVal, maxVal) {
	return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
}

/**
 * Base class for tracking rolled dice.
 */
class DieResultBase {
	constructor() {
		this.rolls = [];
		this.value = 0;
	}

	/**
	 * Adds a given number to the roll list.
	 * @param {Number} value Number to add to the roll list.
	 */
	addResult(value) {
		this.value += value;
		this.rolls.push(value);
	}

	/**
	 * Rolls the die and adds the result to the roll list.
	 */
	addRoll() {
		this.addResult(this.getRoll());
	}

	/**
	 * Rolls the die and returns the result without adding it
	 * to the roll list.
	 * @returns A newly rolled die result.
	 */
	getRoll() {
		throw new Error('addRoll has not been implemented');
	}

	/**
	 * Creates a copy of the die with an empty roll list.
	 * @returns A copy of the die with an empty roll list.
	 */
	getUnrolledCopy() {
		throw new Error('addRoll has not been implemented');
	}

	/**
	 * Marks the die as discarded.
	 */
	discard() {
		this.discarded = true;
	}
}

/**
 * A die result tracking the rolls of a non-custom die.
 */
class DieResult extends DieResultBase {
	constructor(minVal, maxVal) {
		super();
		this.minVal = minVal;
		this.maxVal = maxVal;
	}

	getRoll() {
		return getRandomInRange(this.minVal, this.maxVal);
	}

	getUnrolledCopy() {
		return new DieResult(this.minVal, this.maxVal);
	}
}

/**
 * A die result tracking the rolls of a custom die.
 */
class CustomDieResult extends DieResultBase {
	constructor(sides) {
		super();
		this.sides = sides;
	}

	getRoll() {
		return this.sides[getRandomInRange(0, this.sides.length - 1)];
	}

	getUnrolledCopy() {
		return new CustomDieResult(this.sides);
	}
}

module.exports = { rollCustomDice, rollDice, DieResult, CustomDieResult };