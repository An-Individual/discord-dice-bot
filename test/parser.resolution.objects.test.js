/* eslint-disable no-undef */
const assert = require('assert');
const sinon = require('sinon');
const { ParserResolveTypes, ResolvedNumberType } = require('../parser/parser.constants');
const ParserObjects = require('../parser/resolution/parser.resolution.objects');
const DiceFunctions = require('../parser/parser.dice-functions');
const { TestFormatter } = require('./fake-objects');

describe('StaticNumber Tests', () => {
	it('Text and number correct for 0', () => {
		const staticNum = new ParserObjects.StaticNumber(0);

		const result = staticNum.resolve();
		assert.equal(result.value, 0);
		assert.equal(result.text, '0');
	});

	it('Text and number correct for integer', () => {
		const staticNum = new ParserObjects.StaticNumber(5);

		const result = staticNum.resolve();
		assert.equal(result.value, 5);
		assert.equal(result.text, '5');
	});

	it('Text and number correct for float', () => {
		const staticNum = new ParserObjects.StaticNumber(5.12);

		const result = staticNum.resolve();
		assert.equal(result.value, 5.12);
		assert.equal(result.text, '5.12');
	});

	it('Text and number correct for negative number', () => {
		const staticNum = new ParserObjects.StaticNumber(-5.12);

		const result = staticNum.resolve();
		assert.equal(result.value, -5.12);
		assert.equal(result.text, '-5.12');
	});
});

describe('DiceRoll Tests', () => {
	before(() => {
		sinon.stub(Math, 'random').returns(0.5);
	});

	after(() => {
		sinon.restore();
	});

	it('Simple Die Roll', () => {
		const diceRoll = new ParserObjects.DiceRoll(5, 6);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();

		const result = diceRoll.resolve(tracker, formatter);
		assert.equal(result.length, 5);
		assert.equal(tracker.count, 5);

		for (let i = 0; i < result.length; i++) {
			assert.equal(result[i].value, 4);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Custom Die Roll', () => {
		const sides = [1, 2, 3];
		const diceRoll = new ParserObjects.CustomDiceRoll(5, sides);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();

		const result = diceRoll.resolve(tracker, formatter);
		assert.equal(result.length, 5);
		assert.equal(tracker.count, 5);

		for (let i = 0; i < result.length; i++) {
			assert.equal(result[i].value, 2);
			assert.equal(result[i].rolls[0], 2);
			assert.equal(result[i].sides, sides);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});
});

describe('DiceExplosionRegular Tests', () => {
	beforeEach(() => {
		sinon.stub(Math, 'random').returns(0.5);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('Explode no condition', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6, 6, 6, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionRegular(fakeDiceRoll);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 9);
		assert.equal(result.length, 9);

		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].exploded, true);
		}

		for (let i = 6; i < result.length; i++) {
			assert.equal(result[i].value, 4);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});


	it('Explode with condition', () => {
		const tracker = new TestTracker();
		const fakeDice = makeDiceRollResult([6, 5, 6, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const formatter = new TestFormatter();

		const explode = new ParserObjects.DiceExplosionRegular(fakeDiceRoll, (val) => val > 4);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 9);
		assert.equal(result.length, 9);

		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].exploded, true);
		}

		for (let i = 6; i < result.length; i++) {
			assert.equal(result[i].value, 4);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Explode mixed dice pool', () => {
		const tracker = new TestTracker();
		const fakeDice = makeDiceRollResult([3, 6, 4, 5, 2, 6], 6).concat(makeDiceRollResult([8, 6, 8, 7], 8));
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const formatter = new TestFormatter();

		const explode = new ParserObjects.DiceExplosionRegular(fakeDiceRoll);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 14);
		assert.equal(result.length, 14);

		for (let i = 10; i <= 11; i++) {
			assert.equal(result[i].value, 4);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}

		for (let i = 12; i <= 13; i++) {
			assert.equal(result[i].value, 5);
			assert.equal(result[i].rolls[0], 5);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 8);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Multiple explosions', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.DiceExplosionRegular(fakeDiceRoll);

		const fakeRollResults = [0.99, 0.99, 0.5];
		let rollCount = -1;
		sinon.restore();
		sinon.stub(Math, 'random').callsFake(() => {
			rollCount++;
			return fakeRollResults[rollCount];
		});

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 4);
		assert.equal(result.length, 4);

		for (let i = 0; i <= 2; i++) {
			assert.equal(result[i].value, 6);
			assert.equal(result[i].rolls[0], 6);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}

		assert.equal(result[3].value, 4);
		assert.equal(result[3].rolls[0], 4);
		assert.equal(result[3].minVal, 1);
		assert.equal(result[3].maxVal, 6);
		assert.equal(!result[3].discarded, true);
		assert.equal(!result[3].isCustom, true);
	});

	it('Ignores discarded dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.DiceExplosionRegular(fakeDiceRoll);

		fakeDice[0].discard();

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 1);
		assert.equal(result.length, 1);

		assert.equal(result[0].value, 6);
		assert.equal(result[0].rolls[0], 6);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 6);
		assert.equal(result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);
	});
});

describe('DiceExplosionCompounding Tests', () => {
	beforeEach(() => {
		sinon.stub(Math, 'random').returns(0.5);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('Explode no condition', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6, 6, 6, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionCompounding(fakeDiceRoll);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 9);
		assert.equal(result.length, 6);

		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].value, 10);
			assert.equal(result[i].rolls[0], 6);
			assert.equal(result[i].rolls[1], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(result[i].exploded, true);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});


	it('Explode with condition', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([5, 5, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionCompounding(fakeDiceRoll, (val) => val > 4);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 9);
		assert.equal(result.length, 6);

		for (let i = 6; i < result.length; i++) {
			assert.equal(result[i].value, 9);
			assert.equal(result[i].rolls[0], 5);
			assert.equal(result[i].rolls[1], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(result[i].exploded, true);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Explode mixed dice pool', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6, 6], 6).concat(makeDiceRollResult([8, 8], 8));
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionCompounding(fakeDiceRoll);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 8);
		assert.equal(result.length, 4);

		for (let i = 0; i < 2; i++) {
			assert.equal(result[i].value, 10);
			assert.equal(result[i].rolls[0], 6);
			assert.equal(result[i].rolls[1], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(result[i].exploded, true);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}

		for (let i = 2; i < 4; i++) {
			assert.equal(result[i].value, 13);
			assert.equal(result[i].rolls[0], 8);
			assert.equal(result[i].rolls[1], 5);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 8);
			assert.equal(result[i].exploded, true);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Multiple explosions', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.DiceExplosionCompounding(fakeDiceRoll);

		const fakeRollResults = [0.99, 0.99, 0.5];
		let rollCount = -1;
		sinon.restore();
		sinon.stub(Math, 'random').callsFake(() => {
			rollCount++;
			return fakeRollResults[rollCount];
		});

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 4);
		assert.equal(result.length, 1);

		assert.equal(result[0].value, 22);
		assert.equal(result[0].rolls[0], 6);
		assert.equal(result[0].rolls[1], 6);
		assert.equal(result[0].rolls[2], 6);
		assert.equal(result[0].rolls[3], 4);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 6);
		assert.equal(result[0].exploded, true);
		assert.equal(!result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);
	});

	it('Ignores discarded dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.DiceExplosionCompounding(fakeDiceRoll);

		fakeDice[0].discard();

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 1);
		assert.equal(result.length, 1);

		assert.equal(result[0].value, 6);
		assert.equal(result[0].rolls[0], 6);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 6);
		assert.equal(result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);
	});
});

describe('DiceExplosionPenetrating Tests', () => {
	beforeEach(() => {
		sinon.stub(Math, 'random').returns(0.5);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('Explode no condition', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6, 6, 6, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionPenetrating(fakeDiceRoll);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 9);
		assert.equal(result.length, 9);

		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].exploded, true);
		}

		for (let i = 6; i < result.length; i++) {
			assert.equal(result[i].value, 3);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].rolls[1], -1);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});


	it('Explode with condition', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6, 5, 6, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionPenetrating(fakeDiceRoll, (val) => val > 4);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 9);
		assert.equal(result.length, 9);

		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].exploded, true);
		}

		for (let i = 6; i < result.length; i++) {
			assert.equal(result[i].value, 3);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].rolls[1], -1);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Explode mixed dice pool', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([3, 6, 4, 5, 2, 6], 6).concat(makeDiceRollResult([8, 6, 8, 7], 8));
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);

		const explode = new ParserObjects.DiceExplosionPenetrating(fakeDiceRoll);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 14);
		assert.equal(result.length, 14);

		for (let i = 10; i <= 11; i++) {
			assert.equal(result[i].value, 3);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].rolls[1], -1);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}

		for (let i = 12; i <= 13; i++) {
			assert.equal(result[i].value, 4);
			assert.equal(result[i].rolls[0], 5);
			assert.equal(result[i].rolls[1], -1);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 8);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Multiple explosions', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.DiceExplosionPenetrating(fakeDiceRoll);

		const fakeRollResults = [0.99, 0.99, 0.5];
		let rollCount = -1;
		sinon.restore();
		sinon.stub(Math, 'random').callsFake(() => {
			rollCount++;
			return fakeRollResults[rollCount];
		});

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 4);
		assert.equal(result.length, 4);

		assert.equal(result[0].value, 6);
		assert.equal(result[0].rolls[0], 6);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 6);
		assert.equal(!result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);

		for (let i = 1; i <= 2; i++) {
			assert.equal(result[i].value, 5);
			assert.equal(result[i].rolls[0], 6);
			assert.equal(result[i].rolls[1], -1);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}

		assert.equal(result[3].value, 3);
		assert.equal(result[3].rolls[0], 4);
		assert.equal(result[3].rolls[1], -1);
		assert.equal(result[3].minVal, 1);
		assert.equal(result[3].maxVal, 6);
		assert.equal(!result[3].discarded, true);
		assert.equal(!result[3].isCustom, true);
	});

	it('Ignores discarded dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([6], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.DiceExplosionPenetrating(fakeDiceRoll);

		fakeDice[0].discard();

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 1);
		assert.equal(result.length, 1);

		assert.equal(result[0].value, 6);
		assert.equal(result[0].rolls[0], 6);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 6);
		assert.equal(result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);
	});
});

describe('ReRoll Tests', () => {
	beforeEach(() => {
		sinon.stub(Math, 'random').returns(0.5);
	});

	afterEach(() => {
		sinon.restore();
	});

	it('Simple single reroll', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([5, 3], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.ReRoll(fakeDiceRoll, [(v) => v === 5], false);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 3);
		assert.equal(result.length, 3);

		assert.equal(result[0].discarded, true);
		assert.equal(!result[1].discarded, true);

		assert.equal(result[2].value, 4);
		assert.equal(result[2].rolls[0], 4);
		assert.equal(result[2].minVal, 1);
		assert.equal(result[2].maxVal, 6);
		assert.equal(!result[2].discarded, true);
		assert.equal(!result[2].isCustom, true);
	});

	it('Simple multiple dice rerolled', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([5, 5], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.ReRoll(fakeDiceRoll, [(v) => v === 5], false);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 4);
		assert.equal(result.length, 4);

		assert.equal(result[0].discarded, true);
		assert.equal(result[1].discarded, true);

		for (let i = 2; i < result.length; i++) {
			assert.equal(result[i].value, 4);
			assert.equal(result[i].rolls[0], 4);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 6);
			assert.equal(!result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}
	});

	it('Single die rerolled multiple times', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1], 10);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.ReRoll(fakeDiceRoll, [(v) => v < 4], false);

		let rollCount = 0;
		sinon.restore();
		sinon.stub(Math, 'random').callsFake(() => {
			rollCount++;
			return rollCount * 0.1;
		});

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 4);
		assert.equal(result.length, 4);

		for (let i = 0; i < 3; i++) {
			assert.equal(result[i].value, i + 1);
			assert.equal(result[i].rolls[0], i + 1);
			assert.equal(result[i].minVal, 1);
			assert.equal(result[i].maxVal, 10);
			assert.equal(result[i].discarded, true);
			assert.equal(!result[i].isCustom, true);
		}

		assert.equal(result[3].value, 4);
		assert.equal(result[3].rolls[0], 4);
		assert.equal(result[3].minVal, 1);
		assert.equal(result[3].maxVal, 10);
		assert.equal(!result[3].discarded, true);
		assert.equal(!result[3].isCustom, true);
	});

	it('Reroll once enforced', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1], 10);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.ReRoll(fakeDiceRoll, [(v) => v < 4], true);

		let rollCount = 0;
		sinon.restore();
		sinon.stub(Math, 'random').callsFake(() => {
			rollCount++;
			return rollCount * 0.1;
		});

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 2);
		assert.equal(result.length, 2);

		assert.equal(result[0].value, 1);
		assert.equal(result[0].rolls[0], 1);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 10);
		assert.equal(result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);

		assert.equal(result[1].value, 2);
		assert.equal(result[1].rolls[0], 2);
		assert.equal(result[1].minVal, 1);
		assert.equal(result[1].maxVal, 10);
		assert.equal(!result[1].discarded, true);
		assert.equal(!result[1].isCustom, true);
	});

	it('Ignores discarded dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([5], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.ReRoll(fakeDiceRoll, (v) => v === 5, false);

		fakeDice[0].discard();

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 1);
		assert.equal(result.length, 1);

		assert.equal(result[0].value, 5);
		assert.equal(result[0].rolls[0], 5);
		assert.equal(result[0].minVal, 1);
		assert.equal(result[0].maxVal, 6);
		assert.equal(result[0].discarded, true);
		assert.equal(!result[0].isCustom, true);
	});
});

describe('KeepDropConditional Tests', () => {
	it('Simple keep test with dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([5, 3], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.KeepDropConditional(fakeDiceRoll, [(v) => v === 5], true);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 2);
		assert.equal(result.length, 2);

		assert.equal(!result[0].discarded, true);
		assert.equal(result[1].discarded, true);
	});

	it('Simple drop test with dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([5, 3], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const explode = new ParserObjects.KeepDropConditional(fakeDiceRoll, [(v) => v === 5], false);

		const result = explode.resolve(tracker, formatter);
		assert.equal(tracker.count, 2);
		assert.equal(result.length, 2);

		assert.equal(result[0].discarded, true);
		assert.equal(!result[1].discarded, true);
	});

	it('Simple keep test with numbers', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([5, 3]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const keepDrop = new ParserObjects.KeepDropConditional(fakeList, [(v) => v === 5], true);

		const result = keepDrop.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.length, 2);

		assert.equal(!result[0].discarded, true);
		assert.equal(result[1].discarded, true);
	});

	it('Simple drop test with numbers', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([5, 3]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const keepDrop = new ParserObjects.KeepDropConditional(fakeList, [(v) => v === 5], false);

		const result = keepDrop.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.length, 2);

		assert.equal(result[0].discarded, true);
		assert.equal(!result[1].discarded, true);
	});

	it('Simple keep test multiple conditions', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([5, 2, 3]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const keepDrop = new ParserObjects.KeepDropConditional(fakeList, [(v) => v === 5, (v) => v === 3], false);

		const result = keepDrop.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.length, 3);

		assert.equal(result[0].discarded, true);
		assert.equal(!result[1].discarded, true);
		assert.equal(result[2].discarded, true);
	});
});

describe('KeepDropHighLow Tests', () => {
	it('Keep highest 2 not including discards', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const parserObj = new ParserObjects.KeepDropHighLow(fakeDiceRoll, true, true, 2);
		fakeDice[3].discard();

		const result = parserObj.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.length, 5);

		assert.equal(result[0].discarded, true);
		assert.equal(result[0].value, 1);
		assert.equal(!result[1].discarded, true);
		assert.equal(result[1].value, 5);
		assert.equal(!result[2].discarded, true);
		assert.equal(result[2].value, 3);
		assert.equal(result[3].discarded, true);
		assert.equal(result[3].value, 4);
		assert.equal(result[4].discarded, true);
		assert.equal(result[4].value, 2);
	});

	it('Drop highest 2 not including discards', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const parserObj = new ParserObjects.KeepDropHighLow(fakeDiceRoll, true, false, 2);
		fakeDice[3].discard();

		const result = parserObj.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.length, 5);

		assert.equal(!result[0].discarded, true);
		assert.equal(result[0].value, 1);
		assert.equal(result[1].discarded, true);
		assert.equal(result[1].value, 5);
		assert.equal(result[2].discarded, true);
		assert.equal(result[2].value, 3);
		assert.equal(result[3].discarded, true);
		assert.equal(result[3].value, 4);
		assert.equal(!result[4].discarded, true);
		assert.equal(result[4].value, 2);
	});

	it('Keep lowest 2 not including discards', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const parserObj = new ParserObjects.KeepDropHighLow(fakeDiceRoll, false, true, 2);
		fakeDice[4].discard();

		const result = parserObj.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.length, 5);

		assert.equal(!result[0].discarded, true);
		assert.equal(result[0].value, 1);
		assert.equal(result[1].discarded, true);
		assert.equal(result[1].value, 5);
		assert.equal(!result[2].discarded, true);
		assert.equal(result[2].value, 3);
		assert.equal(result[3].discarded, true);
		assert.equal(result[3].value, 4);
		assert.equal(result[4].discarded, true);
		assert.equal(result[4].value, 2);
	});

	it('Drop lowest 2 not including discards', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const parserObj = new ParserObjects.KeepDropHighLow(fakeDiceRoll, false, false, 2);
		fakeDice[4].discard();

		const result = parserObj.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.length, 5);

		assert.equal(result[0].discarded, true);
		assert.equal(result[0].value, 1);
		assert.equal(!result[1].discarded, true);
		assert.equal(result[1].value, 5);
		assert.equal(result[2].discarded, true);
		assert.equal(result[2].value, 3);
		assert.equal(!result[3].discarded, true);
		assert.equal(result[3].value, 4);
		assert.equal(result[4].discarded, true);
		assert.equal(result[4].value, 2);
	});

	it('Simple number list test', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([1, 5, 3, 4, 2]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const parserObj = new ParserObjects.KeepDropHighLow(fakeList, false, false, 2);
		fakeNumbers[4].discard(new TestFormatter());

		const result = parserObj.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.length, 5);

		assert.equal(result[0].discarded, true);
		assert.equal(result[0].value, 1);
		assert.equal(!result[1].discarded, true);
		assert.equal(result[1].value, 5);
		assert.equal(result[2].discarded, true);
		assert.equal(result[2].value, 3);
		assert.equal(!result[3].discarded, true);
		assert.equal(result[3].value, 4);
		assert.equal(result[4].discarded, true);
		assert.equal(result[4].value, 2);
	});
});

describe('NumberMatcher Tests', () => {
	it('Result sorted by number of matches followed by matched number discards at end', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([1, 3, 1, 7, 5, 1, 5, 5]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const matcher = new ParserObjects.NumberMatcher(fakeList, false);
		fakeNumbers[6].discard(new TestFormatter());

		const result = matcher.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 23);
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
		assert.equal(result.text, '(1 + 1 + 1 + 5 + 5 + 7 + 3 + ~~5~~)');
	});

	it('Result sorted by number of matches followed by matched number discards at end with dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1, 3, 1, 7, 5, 1, 5, 5], 10);
		const fakeDiceResult = new FakeDiceRoll(fakeDice);
		const matcher = new ParserObjects.NumberMatcher(fakeDiceResult, false);
		fakeDice[6].discard();

		const result = matcher.resolve(tracker, formatter);
		assert.equal(tracker.count, 8);
		assert.equal(result.value, 23);
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
		assert.equal(result.text, '([1] + [1] + [1] + [5] + [5] + [7] + [3] + ~~[5]~~)');
	});

	it('Matches counted excluding discarded', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([1, 2, 1, 1, 2, 3, 4, 3]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const matcher = new ParserObjects.NumberMatcher(fakeList, true);
		fakeNumbers[1].discard(new TestFormatter());

		const result = matcher.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 2);
		assert.equal(result.type, ResolvedNumberType.MATCH_COUNT);
		assert.equal(result.text, '(1 + 1 + 1 + 3 + 3 + 4 + 2 + ~~2~~)');
	});
});

describe('SuccessFailCounter Tests', () => {
	it('Successes counted', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([3, 1, 4, 5, 1]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const matcher = new ParserObjects.SuccessFailCounter(fakeList, n => n > 2);
		fakeNumbers[0].discard(new TestFormatter());

		const result = matcher.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 2);
		assert.equal(result.type, ResolvedNumberType.SUCCESS_FAIL);
		assert.equal(result.text, '(~~3~~ + 1 + 4 + 5 + 1)');
	});

	it('Successes counted & reduced by failures', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([3, 1, 4, 5, 1]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const matcher = new ParserObjects.SuccessFailCounter(fakeList, n => n > 2, n => n <= 2);

		const result = matcher.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 1);
		assert.equal(result.type, ResolvedNumberType.SUCCESS_FAIL);
		assert.equal(result.text, '(3 + 1 + 4 + 5 + 1)');
	});

	it('Successes counted & reduced by failures with dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([3, 1, 4, 5, 1], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const matcher = new ParserObjects.SuccessFailCounter(fakeDiceRoll, n => n > 2, n => n <= 2);

		const result = matcher.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.value, 1);
		assert.equal(result.type, ResolvedNumberType.SUCCESS_FAIL);
		assert.equal(result.text, '(__[3]__ + *[1]* + __[4]__ + __[5]__ + *[1]*)');
	});
});

describe('Bracket Tests', () => {
	it('Number gets brackets', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const number = new ParserObjects.StaticNumber(5);
		const bracket = new ParserObjects.Bracket(number);

		const result = bracket.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 5);
		assert.equal(result.text, '(5)');
	});

	it('Dice not modified', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice = makeDiceRollResult([1, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const bracket = new ParserObjects.Bracket(fakeDiceRoll);

		const result = bracket.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.length, 5);
		assert.equal(!result.text, true);

		assert.equal(result[0].value, 1);
		assert.equal(result[1].value, 5);
		assert.equal(result[2].value, 3);
		assert.equal(result[3].value, 4);
		assert.equal(result[4].value, 2);
	});

	it('Number list not modified', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeNumbers = makeNumberList([3, 1, 4, 5, 1]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const bracket = new ParserObjects.Bracket(fakeList);

		const result = bracket.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.length, 5);
		assert.equal(!result.text, true);

		assert.equal(result[0].value, 3);
		assert.equal(result[1].value, 1);
		assert.equal(result[2].value, 4);
		assert.equal(result[3].value, 5);
		assert.equal(result[4].value, 1);
	});
});

describe('NumberList Tests', () => {
	it('Everything resolves to numbers', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const number = new ParserObjects.StaticNumber(5);
		const fakeDice = makeDiceRollResult([1, 5, 3, 4, 2], 6);
		const fakeDiceRoll = new FakeDiceRoll(fakeDice);
		const fakeNumbers = makeNumberList([3, 1, 4, 5, 1]);
		const fakeList = new FakeNumberList(fakeNumbers);
		const numberList = new ParserObjects.NumberList([number, fakeDiceRoll, fakeList]);

		const result = numberList.resolve(tracker, formatter);
		assert.equal(tracker.count, 5);
		assert.equal(result.length, 3);

		assert.equal(result[0].value, 5);
		assert.equal(result[0].text, '5');
		assert.equal(result[1].value, 15);
		assert.equal(result[1].text, '([1] + [5] + [3] + [4] + [2])');
		assert.equal(result[2].value, 14);
		assert.equal(result[2].text, '(3 + 1 + 4 + 5 + 1)');
	});
});

describe('Function Object Tests', () => {
	it('Ceiling test', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const number = new ParserObjects.StaticNumber(5.1);
		const func = new ParserObjects.Ceiling(number);

		const result = func.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 6);
		assert.equal(result.text, 'ceil(5.1)');
	});

	it('Floor test', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const number = new ParserObjects.StaticNumber(5.9);
		const func = new ParserObjects.Floor(number);

		const result = func.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 5);
		assert.equal(result.text, 'floor(5.9)');
	});

	it('Round test', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const number1 = new ParserObjects.StaticNumber(5.5);
		const func1 = new ParserObjects.Round(number1);

		const result1 = func1.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result1.value, 6);
		assert.equal(result1.text, 'round(5.5)');

		const number2 = new ParserObjects.StaticNumber(5.4);
		const func2 = new ParserObjects.Round(number2);

		const result2 = func2.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result2.value, 5);
		assert.equal(result2.text, 'round(5.4)');
	});

	it('Absolute test', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const number = new ParserObjects.StaticNumber(-5);
		const func = new ParserObjects.Absolute(number);

		const result = func.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 5);
		assert.equal(result.text, 'abs(-5)');
	});
});

describe('Math Object Tests', () => {
	it('Add dice to dice', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice1 = makeDiceRollResult([3], 6);
		const fakeDiceRoll1 = new FakeDiceRoll(fakeDice1);
		const fakeDice2 = makeDiceRollResult([5], 6);
		const fakeDiceRoll2 = new FakeDiceRoll(fakeDice2);
		const mathFunc = new ParserObjects.MathAdd(fakeDiceRoll1, fakeDiceRoll2);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 2);
		assert.equal(result.length, 2);
		assert.equal(result[0].value, 3);
		assert.equal(result[1].value, 5);
	});

	it('Add dice to number', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const fakeDice1 = makeDiceRollResult([3], 6);
		const fakeDiceRoll1 = new FakeDiceRoll(fakeDice1);
		const number = new ParserObjects.StaticNumber(5);
		const mathFunc = new ParserObjects.MathAdd(fakeDiceRoll1, number);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 1);
		assert.equal(result.value, 8);
		assert.equal(result.text, '[3] + 5');
	});

	it('Add number to number', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const leftNumber = new ParserObjects.StaticNumber(3);
		const rightNumber = new ParserObjects.StaticNumber(5);
		const mathFunc = new ParserObjects.MathAdd(leftNumber, rightNumber);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 8);
		assert.equal(result.text, '3 + 5');
	});

	it('Subtract', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const leftNumber = new ParserObjects.StaticNumber(3);
		const rightNumber = new ParserObjects.StaticNumber(5);
		const mathFunc = new ParserObjects.MathSubtract(leftNumber, rightNumber);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, -2);
		assert.equal(result.text, '3 - 5');
	});

	it('Multiply', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const leftNumber = new ParserObjects.StaticNumber(3);
		const rightNumber = new ParserObjects.StaticNumber(5);
		const mathFunc = new ParserObjects.MathMultiply(leftNumber, rightNumber);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 15);
		assert.equal(result.text, '3 \\* 5');
	});

	it('Divide', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const leftNumber = new ParserObjects.StaticNumber(3);
		const rightNumber = new ParserObjects.StaticNumber(2);
		const mathFunc = new ParserObjects.MathDivide(leftNumber, rightNumber);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 1.5);
		assert.equal(result.text, '3 / 2');
	});

	it('Modulo', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const leftNumber = new ParserObjects.StaticNumber(51);
		const rightNumber = new ParserObjects.StaticNumber(10);
		const mathFunc = new ParserObjects.MathModulo(leftNumber, rightNumber);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 1);
		assert.equal(result.text, '51 % 10');
	});

	it('Exponent', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const leftNumber = new ParserObjects.StaticNumber(2);
		const rightNumber = new ParserObjects.StaticNumber(3);
		const mathFunc = new ParserObjects.MathExponent(leftNumber, rightNumber);

		const result = mathFunc.resolve(tracker, formatter);
		assert.equal(tracker.count, 0);
		assert.equal(result.value, 8);
		assert.equal(result.text, '2 ^ 3');
	});
});

class TestTracker {
	constructor() {
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
	}
}

class FakeDiceRoll {
	constructor(dice) {
		this.dice = dice;
	}

	resolve(track) {
		track.notifyNewDice(this.dice.length);
		return this.dice;
	}

	getResolveType() {
		return ParserResolveTypes.DICE_ROLL;
	}
}

class FakeNumberList {
	constructor(values) {
		this.values = values;
	}

	resolve() {
		return this.values;
	}

	getResolveType() {
		return ParserResolveTypes.NUMBER_LIST;
	}
}

function makeDiceRollResult(values, dieSize) {
	const result = [];
	for (let i = 0; i < values.length; i++) {
		result[i] = new DiceFunctions.DieResult(1, dieSize);
		result[i].addResult(values[i]);
	}
	return result;
}

function makeNumberList(values) {
	const result = [];
	for (let i = 0; i < values.length; i++) {
		result[i] = new ParserObjects.ResolvedNumber(values[i], values[i].toString());
	}
	return result;
}