/* eslint-disable no-undef */
const assert = require('assert');
const { ParserResolveTypes } = require('../parser/parser.constants');
const ParserObjects = require('../parser/resolution/parser.resolution.objects');
const { DiceStringIterator } = require('../parser/parser.iterator');
const {
	processSimpleDiceString,
	processRollModifier,
	processExplosionModifier,
	processRerollModifier,
	processKeepDropModifier,
} = require('../parser/processing/parser.processing.dice');


describe('processSimpleDiceString Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if not started with a "d"', () => {
		const iterator = new DiceStringIterator('a6');
		assert.throws(() => {
			processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if nothing after "d"', () => {
		const iterator = new DiceStringIterator('d');
		assert.throws(() => {
			processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if "d" not followed by a number or "f"', () => {
		const iterator = new DiceStringIterator('da');
		assert.throws(() => {
			processSimpleDiceString(iterator);
		});
	});

	it('Single digit regular die', () => {
		const iterator = new DiceStringIterator('d6');
		const result = processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 6);
		assert.equal(result.getResolveType(), ParserResolveTypes.DICE_ROLL);
	});

	it('Multi-digit regular die', () => {
		const iterator = new DiceStringIterator('d20');
		const result = processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 20);
		assert.equal(result.getResolveType(), ParserResolveTypes.DICE_ROLL);
	});

	it('Multiple regular dice', () => {
		const iterator = new DiceStringIterator('d20');
		const result = processSimpleDiceString(iterator, 3);

		assert.equal(result.numDice, 3);
		assert.equal(result.numSides, 20);
		assert.equal(result.getResolveType(), ParserResolveTypes.DICE_ROLL);
	});

	it('Single fudge die', () => {
		const iterator = new DiceStringIterator('df');
		const result = processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 1);
		assert.equal(result.minValue, -1);
		assert.equal(result.getResolveType(), ParserResolveTypes.DICE_ROLL);
	});

	it('Multiple fudge dice', () => {
		const iterator = new DiceStringIterator('df');
		const result = processSimpleDiceString(iterator, 3);

		assert.equal(result.numDice, 3);
		assert.equal(result.numSides, 1);
		assert.equal(result.minValue, -1);
		assert.equal(result.getResolveType(), ParserResolveTypes.DICE_ROLL);
	});
});

describe('processKeepDropModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('"k" or "d" not followed by number throws error', () => {
		let iterator = new DiceStringIterator('k');
		assert.throws(() => {
			processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});

		iterator = new DiceStringIterator('d');
		assert.throws(() => {
			processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Specific keep', () => {
		const iterator = new DiceStringIterator('k5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Specific keep chain', () => {
		const iterator = new DiceStringIterator('k5k3k2');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions.length, 3);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.conditions[1](3), true);
		assert.equal(result.conditions[2](2), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep high breaks keep chain', () => {
		const iterator = new DiceStringIterator('k5kh3k2');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions.length, 1);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Specific drop', () => {
		const iterator = new DiceStringIterator('d5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default keep high', () => {
		const iterator = new DiceStringIterator('kh');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default drop high', () => {
		const iterator = new DiceStringIterator('dh');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default keep low', () => {
		const iterator = new DiceStringIterator('kl');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default drop low', () => {
		const iterator = new DiceStringIterator('dl');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep high with count', () => {
		const iterator = new DiceStringIterator('kh3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Drop high with count', () => {
		const iterator = new DiceStringIterator('dh3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep low with count', () => {
		const iterator = new DiceStringIterator('kl3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Drop low with count', () => {
		const iterator = new DiceStringIterator('dl3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});
});

describe('processRerollModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('No compare point throws error', () => {
		let iterator = new DiceStringIterator('r');
		assert.throws(() => {
			processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});

		iterator = new DiceStringIterator('ro');
		assert.throws(() => {
			processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Regular reroll', () => {
		const iterator = new DiceStringIterator('r5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.onlyOnce, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Reroll once', () => {
		const iterator = new DiceStringIterator('ro5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.onlyOnce, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Regular reroll chain', () => {
		const iterator = new DiceStringIterator('r5r3r>9');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.conditionMatches(3), true);
		assert.equal(result.conditionMatches(10), true);
		assert.equal(result.onlyOnce, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Reroll once chain', () => {
		const iterator = new DiceStringIterator('ro5ro3ro>9');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.conditionMatches(3), true);
		assert.equal(result.conditionMatches(10), true);
		assert.equal(result.onlyOnce, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Mixing reroll and reroll once breaks condition chain', () => {
		let iterator = new DiceStringIterator('r5ro3');
		const result1 = processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));

		assert.equal(!result1.onlyOnce, true);
		assert.equal(result1.conditions.length, 1);
		assert.equal(result1.conditions[0](3), false);

		iterator = new DiceStringIterator('ro5r3');
		const result2 = processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));

		assert.equal(result2.onlyOnce, true);
		assert.equal(result2.conditions.length, 1);
		assert.equal(result2.conditions[0](3), false);
	});
});

describe('processExplosionModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			processExplosionModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			processExplosionModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Regular unmodified explosion', () => {
		const iterator = new DiceStringIterator('!');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Regular explosion with condition', () => {
		const iterator = new DiceStringIterator('!5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Compounding unmodified explosion', () => {
		const iterator = new DiceStringIterator('!!');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Compounding explosion with condition', () => {
		const iterator = new DiceStringIterator('!!5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Penetrating unmodified explosion', () => {
		const iterator = new DiceStringIterator('!p');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Penetrating explosion with condition', () => {
		const iterator = new DiceStringIterator('!p5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});
});

describe('processRollModifier Tests', () => {
	it('Empty iterator returns same dice roll', () => {
		const iterator = new DiceStringIterator('');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);
		const newRoll = processRollModifier(iterator, originalRoll);

		assert.deepStrictEqual(newRoll, originalRoll);
	});

	it('processExplosionModifier called', () => {
		const iterator = new DiceStringIterator('!');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const newRoll = processRollModifier(iterator, originalRoll);

		assert.equal(newRoll instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(!newRoll.condition, true);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});

	it('processRerollModifier called', () => {
		const iterator = new DiceStringIterator('r5');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const newRoll = processRollModifier(iterator, originalRoll);

		assert.equal(newRoll instanceof ParserObjects.ReRoll, true);
		assert.equal(newRoll.conditionMatches(5), true);
		assert.equal(newRoll.onlyOnce, false);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});

	it('processKeepDropModifier with keep called', () => {
		const iterator = new DiceStringIterator('k5');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		newRoll = processRollModifier(iterator, originalRoll);

		assert.equal(newRoll instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(newRoll.conditions[0](5), true);
		assert.equal(newRoll.isKeep, true);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});

	it('processKeepDropModifier with drop called', () => {
		const iterator = new DiceStringIterator('dl');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const newRoll = processRollModifier(iterator, originalRoll);

		assert.equal(newRoll instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(newRoll.isHigh, false);
		assert.equal(newRoll.isKeep, false);
		assert.equal(newRoll.count, 1);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});
});