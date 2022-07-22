function rollCustomDice(num, valueRange) {
	return rollDiceWithFunc(num, () => new CustomDieResult(valueRange));
}

function rollDice(num, minVal, maxVal) {
	return rollDiceWithFunc(num, () => new DieResult(minVal, maxVal));
}

function rollDiceWithFunc(num, dieBuilderFunc) {
	const result = [];

	for (let i = 0; i < num; i++) {
		const die = dieBuilderFunc();
		die.addRoll();
		result[i] = die;
	}

	return result;
}

function getRandomInRange(minVal, maxVal) {
	return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
}

class DieResultBase {
	constructor() {
		this.rolls = [];
		this.value = 0;
	}

	addResult(value) {
		this.value += value;
		this.rolls.push(value);
	}

	addRoll() {
		this.addResult(this.getRoll());
	}

	getRoll() {
		throw new Error('addRoll has not been implemented');
	}

	getUnrolledCopy() {
		throw new Error('addRoll has not been implemented');
	}

	discard() {
		this.discarded = true;
	}
}

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