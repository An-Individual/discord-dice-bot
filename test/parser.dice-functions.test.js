/* eslint-disable no-undef */
const assert = require('assert');
const sinon = require('sinon');
const DiceFunctions = require('../parser/parser.dice-functions');

describe('Dice Roller Tests: Low Rolls', () => {
	before(() => {
		sinon.stub(Math, 'random').returns(0);
	});

	after(() => {
		sinon.restore();
	});

	it('Simple roll returns 1', () => {
		const result = DiceFunctions.rollDice(1, 1, 100);
		assert.equal(result.length, 1);

		const die = result[0];
		assert.equal(die.value, 1);
		assert.equal(die.rolls[0], 1);
		assert.equal(die.minVal, 1);
		assert.equal(die.maxVal, 100);
		assert.equal(!die.discarded, true);
		assert.equal(!die.isCustom, true);
	});

	it('Custom roll returns first result', () => {
		const customRange = [1, 2, 3];
		const result = DiceFunctions.rollCustomDice(1, customRange);
		assert.equal(result.length, 1);

		const die = result[0];
		assert.equal(die.value, 1);
		assert.equal(die.rolls[0], 1);
		assert.equal(die.sides, customRange);
		assert.equal(!die.discarded, true);
	});

	it('Simple many roll returns 3 1s', () => {
		const result = DiceFunctions.rollDice(3, 1, 100);

		assert.equal(result.length, 3);
		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].rolls[0], 1);
			assert.equal(result[i].value, 1);
		}
	});

	it('Custom many roll returns 3 first results', () => {
		const result = DiceFunctions.rollCustomDice(3, [1, 2, 3]);

		assert.equal(result.length, 3);
		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].rolls[0], 1);
			assert.equal(result[i].value, 1);
		}
	});
});

describe('Dice Roller Tests: Middle Rolls', () => {
	before(() => {
		sinon.stub(Math, 'random').returns(0.50);
	});

	after(() => {
		sinon.restore();
	});

	it('Simple roll returns 51', () => {
		const result = DiceFunctions.rollDice(1, 1, 100);
		assert.equal(result.length, 1);

		const die = result[0];
		assert.equal(die.value, 51);
		assert.equal(die.rolls[0], 51);
		assert.equal(die.minVal, 1);
		assert.equal(die.maxVal, 100);
		assert.equal(!die.discarded, true);
		assert.equal(!die.isCustom, true);
	});

	it('Custom roll returns middle result', () => {
		const customRange = [1, 2, 3];
		const result = DiceFunctions.rollCustomDice(1, customRange);
		assert.equal(result.length, 1);

		const die = result[0];
		assert.equal(die.value, 2);
		assert.equal(die.rolls[0], 2);
		assert.equal(die.sides, customRange);
		assert.equal(!die.discarded, true);
	});
});

describe('Dice Roller Tests: High Rolls', () => {
	before(() => {
		sinon.stub(Math, 'random').returns(0.99);
	});

	after(() => {
		sinon.restore();
	});

	it('Simple roll returns 100', () => {
		const result = DiceFunctions.rollDice(1, 1, 100);
		assert.equal(result.length, 1);

		const die = result[0];
		assert.equal(die.value, 100);
		assert.equal(die.rolls[0], 100);
		assert.equal(die.minVal, 1);
		assert.equal(die.maxVal, 100);
		assert.equal(!die.discarded, true);
		assert.equal(!die.isCustom, true);
	});

	it('Custom roll returns last result', () => {
		const customRange = [1, 2, 3];
		const result = DiceFunctions.rollCustomDice(1, customRange);
		assert.equal(result.length, 1);

		const die = result[0];
		assert.equal(die.value, 3);
		assert.equal(die.rolls[0], 3);
		assert.equal(die.sides, customRange);
		assert.equal(!die.discarded, true);
	});

	it('Simple many roll returns 3 100s', () => {
		const result = DiceFunctions.rollDice(3, 1, 100);

		assert.equal(result.length, 3);
		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].rolls[0], 100);
			assert.equal(result[i].value, 100);
		}
	});

	it('Custom many roll returns 3 last results', () => {
		const result = DiceFunctions.rollCustomDice(3, [1, 2, 3]);

		assert.equal(result.length, 3);
		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].rolls[0], 3);
			assert.equal(result[i].value, 3);
		}
	});
});

describe('Dice Roller Tests: Die roll functions', () => {
	beforeEach(() => {
		sinon.stub(Math, 'random').returns(0.5);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('Simple die addRoll adds new die', () => {
		const result = DiceFunctions.rollDice(1, 1, 100);
		const die = result[0];

		sinon.restore();
		sinon.stub(Math, 'random').returns(0.99);

		die.addRoll();

		assert.equal(die.rolls.length, 2);
		assert.equal(die.rolls[0], 51);
		assert.equal(die.rolls[1], 100);
		assert.equal(die.value, 151);
	});

	it('Simple die addResult adds new arbitrary result', () => {
		const result = DiceFunctions.rollDice(1, 1, 100);
		const die = result[0];
		die.addResult(123);

		assert.equal(die.rolls.length, 2);
		assert.equal(die.rolls[0], 51);
		assert.equal(die.rolls[1], 123);
		assert.equal(die.value, 174);
	});

	it('Simple die getUnrolledCopy makes empty rollable duplicate', () => {
		const result = DiceFunctions.rollDice(1, 1, 100);
		const die = result[0];
		const copy = die.getUnrolledCopy();

		assert.equal(copy.rolls.length, 0);
		assert.equal(copy.value, 0);

		sinon.restore();
		sinon.stub(Math, 'random').returns(0.99);

		copy.addRoll();

		assert.equal(copy.rolls.length, 1);
		assert.equal(copy.rolls[0], 100);
		assert.equal(copy.value, 100);
	});

	it('Custom die getUnrolledCopy makes empty rollable duplicate', () => {
		const result = DiceFunctions.rollCustomDice(1, [1, 2, 3]);
		const die = result[0];
		const copy = die.getUnrolledCopy();

		assert.equal(copy.rolls.length, 0);
		assert.equal(copy.value, 0);

		sinon.restore();
		sinon.stub(Math, 'random').returns(0.99);

		copy.addRoll();

		assert.equal(copy.rolls.length, 1);
		assert.equal(copy.rolls[0], 3);
		assert.equal(copy.value, 3);
	});
});