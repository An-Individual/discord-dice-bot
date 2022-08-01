/* eslint-disable no-undef */
const assert = require('assert');
const { ProcessFunctions, ResolveDiceString, isIntChar, standardizeDiceString } = require('../parser');
const { DiceStringIterator } = require('../parser.iterator');
const { Brackets } = require('../parser.carving');
const ParserObjects = require('../parser-objects');
const sinon = require('sinon');

describe('Roll Parser Standardization', () => {
	it('Remove spaces', () => {
		assert.equal(standardizeDiceString(' 1 2 3 '), '123');
	});

	it('Remove new lines', () => {
		assert.equal(standardizeDiceString('\r\n1\r\n2\r\n3\r\n'), '123');
	});

	it('Remove tabs', () => {
		assert.equal(standardizeDiceString('\t1\t2\t3\t'), '123');
	});

	it('Lower case', () => {
		assert.equal(standardizeDiceString('ABC123'), 'abc123');
	});
});

describe('StringIterator Tests', () => {
	it('Empty string immediately done', () => {
		const text = '';
		const iterator = new DiceStringIterator(text);

		assert.equal(iterator.next().done, true);
	});

	it('Empty string peek is done', () => {
		const text = '';
		const iterator = new DiceStringIterator(text);

		assert.equal(iterator.peek().done, true);
	});

	it('All characters match', () => {
		const text = 'abc123';
		const iterator = new DiceStringIterator(text);

		for (let i = 0; i < text.length; i++) {
			assert.equal(iterator.next().value, text[i]);
		}
	});

	it('Iterator terminates', () => {
		const text = 'abc123';
		const iterator = new DiceStringIterator(text);

		let i = 0;
		while (!iterator.next().done) {
			i++;
		}

		assert.equal(i, 6);
	});

	it('Peeks match next', () => {
		const text = 'abc123';
		const iterator = new DiceStringIterator(text);

		for (let i = 0; i < text.length + 1; i++) {
			const peek = iterator.peek();
			const next = iterator.next();
			assert.equal(peek.value, next.value);
			assert.equal(peek.done, next.done);
		}
	});
});

describe('isIntChar Tests', () => {
	it('Undefined input returns false', () => {
		assert.equal(isIntChar({}.value), false);
	});

	it('Not int char returns false', () => {
		assert.equal(isIntChar('.'), false);
	});

	it('Numbers return true', () => {
		assert.equal(isIntChar('0'), true);
		assert.equal(isIntChar('1'), true);
		assert.equal(isIntChar('2'), true);
		assert.equal(isIntChar('3'), true);
		assert.equal(isIntChar('4'), true);
		assert.equal(isIntChar('5'), true);
		assert.equal(isIntChar('6'), true);
		assert.equal(isIntChar('7'), true);
		assert.equal(isIntChar('8'), true);
		assert.equal(isIntChar('9'), true);
		assert.equal(isIntChar('-'), true);
	});
});

describe('processInt Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			ProcessFunctions.processInt(iterator);
		});
	});

	it('Not integer throws error', () => {
		const iterator = new DiceStringIterator('.');
		assert.throws(() => {
			ProcessFunctions.processInt(iterator);
		});
	});

	it('Single char int is read', () => {
		const iterator = new DiceStringIterator('5');
		assert.equal(ProcessFunctions.processInt(iterator), 5);
	});

	it('Multi-char int is read', () => {
		const iterator = new DiceStringIterator('12345');
		assert.equal(ProcessFunctions.processInt(iterator), 12345);
	});

	it('Stops at non-int chars', () => {
		const iterator = new DiceStringIterator('123.45');
		assert.equal(ProcessFunctions.processInt(iterator), 123);
		assert.equal(iterator.next().value, '.');
	});

	it('Starts at current iterator position', () => {
		const iterator = new DiceStringIterator('12345');
		iterator.next();
		iterator.next();
		assert.equal(ProcessFunctions.processInt(iterator), 345);
	});

	it('Regular negative number', () => {
		const iterator = new DiceStringIterator('-123');
		assert.equal(ProcessFunctions.processInt(iterator), -123);
	});

	it('"-" after start of string causes error', () => {
		const iterator = new DiceStringIterator('1-23');
		assert.throws(() => {
			ProcessFunctions.processInt(iterator);
		});
	});
});

describe('processSimpleDiceString Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if not started with a "d"', () => {
		const iterator = new DiceStringIterator('a6');
		assert.throws(() => {
			ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if nothing after "d"', () => {
		const iterator = new DiceStringIterator('d');
		assert.throws(() => {
			ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if "d" not followed by a number or "f"', () => {
		const iterator = new DiceStringIterator('da');
		assert.throws(() => {
			ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Single digit regular die', () => {
		const iterator = new DiceStringIterator('d6');
		const result = ProcessFunctions.processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 6);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Multi-digit regular die', () => {
		const iterator = new DiceStringIterator('d20');
		const result = ProcessFunctions.processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 20);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Multiple regular dice', () => {
		const iterator = new DiceStringIterator('d20');
		const result = ProcessFunctions.processSimpleDiceString(iterator, 3);

		assert.equal(result.numDice, 3);
		assert.equal(result.numSides, 20);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Single fudge die', () => {
		const iterator = new DiceStringIterator('df');
		const result = ProcessFunctions.processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 1);
		assert.equal(result.minValue, -1);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Multiple fudge dice', () => {
		const iterator = new DiceStringIterator('df');
		const result = ProcessFunctions.processSimpleDiceString(iterator, 3);

		assert.equal(result.numDice, 3);
		assert.equal(result.numSides, 1);
		assert.equal(result.minValue, -1);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});
});

describe('processComparePoint Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			ProcessFunctions.processComparePoint(iterator);
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			ProcessFunctions.processComparePoint(iterator);
		});
	});

	it('No following number throws error', () => {
		let iterator = new DiceStringIterator('=');
		assert.throws(() => {
			ProcessFunctions.processComparePoint(iterator);
		});

		iterator = new DiceStringIterator('>');
		assert.throws(() => {
			ProcessFunctions.processComparePoint(iterator);
		});

		iterator = new DiceStringIterator('<');
		assert.throws(() => {
			ProcessFunctions.processComparePoint(iterator);
		});
	});

	it('= checks for specific value', () => {
		const iterator = new DiceStringIterator('=15');
		const compareFunc = ProcessFunctions.processComparePoint(iterator);

		assert.equal(compareFunc(15), true);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), false);
	});

	it('< checks for lower value', () => {
		const iterator = new DiceStringIterator('<15');
		const compareFunc = ProcessFunctions.processComparePoint(iterator);

		assert.equal(compareFunc(15), false);
		assert.equal(compareFunc(14), true);
		assert.equal(compareFunc(16), false);
	});

	it('> checks for higher value', () => {
		const iterator = new DiceStringIterator('>15');
		const compareFunc = ProcessFunctions.processComparePoint(iterator);

		assert.equal(compareFunc(15), false);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), true);
	});
});

describe('processModifierComparePoint Tests', () => {
	it('Integer checks for specific value', () => {
		const iterator = new DiceStringIterator('15');
		const compareFunc = ProcessFunctions.processModifierComparePoint(iterator);

		assert.equal(compareFunc(15), true);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), false);
	});

	it('Non-number calls processComparePoint', () => {
		const iterator = new DiceStringIterator('');
		const spy = sinon.spy(ProcessFunctions, 'processModifierComparePoint');

		try {
			assert.throws(() => {
				ProcessFunctions.processModifierComparePoint(iterator);
			});
		}
		finally {
			spy.restore();
		}

		sinon.assert.calledOnce(spy);
	});
});

describe('processKeepDropModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('"k" or "d" not followed by number throws error', () => {
		let iterator = new DiceStringIterator('k');
		assert.throws(() => {
			ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});

		iterator = new DiceStringIterator('d');
		assert.throws(() => {
			ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Specific keep', () => {
		const iterator = new DiceStringIterator('k5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Specific keep chain', () => {
		const iterator = new DiceStringIterator('k5k3k2');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

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
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions.length, 1);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Specific drop', () => {
		const iterator = new DiceStringIterator('d5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default keep high', () => {
		const iterator = new DiceStringIterator('kh');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default drop high', () => {
		const iterator = new DiceStringIterator('dh');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default keep low', () => {
		const iterator = new DiceStringIterator('kl');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default drop low', () => {
		const iterator = new DiceStringIterator('dl');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep high with count', () => {
		const iterator = new DiceStringIterator('kh3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Drop high with count', () => {
		const iterator = new DiceStringIterator('dh3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep low with count', () => {
		const iterator = new DiceStringIterator('kl3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Drop low with count', () => {
		const iterator = new DiceStringIterator('dl3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processKeepDropModifier(iterator, roll);

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
			ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('No compare point throws error', () => {
		let iterator = new DiceStringIterator('r');
		assert.throws(() => {
			ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});

		iterator = new DiceStringIterator('ro');
		assert.throws(() => {
			ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Regular reroll', () => {
		const iterator = new DiceStringIterator('r5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.onlyOnce, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Reroll once', () => {
		const iterator = new DiceStringIterator('ro5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.onlyOnce, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Regular reroll chain', () => {
		const iterator = new DiceStringIterator('r5r3r>9');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processRerollModifier(iterator, roll);

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
		const result = ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.conditionMatches(3), true);
		assert.equal(result.conditionMatches(10), true);
		assert.equal(result.onlyOnce, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Mixing reroll and reroll once breaks condition chain', () => {
		let iterator = new DiceStringIterator('r5ro3');
		const result1 = ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));

		assert.equal(!result1.onlyOnce, true);
		assert.equal(result1.conditions.length, 1);
		assert.equal(result1.conditions[0](3), false);

		iterator = new DiceStringIterator('ro5r3');
		const result2 = ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));

		assert.equal(result2.onlyOnce, true);
		assert.equal(result2.conditions.length, 1);
		assert.equal(result2.conditions[0](3), false);
	});
});

describe('processExplosionModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			ProcessFunctions.processExplosionModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Invalid character throws error', () => {
		const iterator = new DiceStringIterator('5');
		assert.throws(() => {
			ProcessFunctions.processExplosionModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Regular unmodified explosion', () => {
		const iterator = new DiceStringIterator('!');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Regular explosion with condition', () => {
		const iterator = new DiceStringIterator('!5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Compounding unmodified explosion', () => {
		const iterator = new DiceStringIterator('!!');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Compounding explosion with condition', () => {
		const iterator = new DiceStringIterator('!!5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Penetrating unmodified explosion', () => {
		const iterator = new DiceStringIterator('!p');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Penetrating explosion with condition', () => {
		const iterator = new DiceStringIterator('!p5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});
});

describe('processRollModifier Tests', () => {
	it('Empty iterator returns same dice roll', () => {
		const iterator = new DiceStringIterator('');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);
		const newRoll = ProcessFunctions.processRollModifier(iterator, originalRoll);

		assert.deepStrictEqual(newRoll, originalRoll);
	});

	it('processExplosionModifier called', () => {
		const iterator = new DiceStringIterator('!');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(ProcessFunctions, 'processExplosionModifier');
		let newRoll;
		try {
			newRoll = ProcessFunctions.processRollModifier(iterator, originalRoll);
		}
		finally {
			spy.restore();
		}

		sinon.assert.calledOnce(spy);

		assert.equal(newRoll instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(!newRoll.condition, true);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});

	it('processRerollModifier called', () => {
		const iterator = new DiceStringIterator('r5');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(ProcessFunctions, 'processRerollModifier');
		let newRoll;
		try {
			newRoll = ProcessFunctions.processRollModifier(iterator, originalRoll);
		}
		finally {
			spy.restore();
		}

		sinon.assert.calledOnce(spy);

		assert.equal(newRoll instanceof ParserObjects.ReRoll, true);
		assert.equal(newRoll.conditionMatches(5), true);
		assert.equal(newRoll.onlyOnce, false);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});

	it('processKeepDropModifier with keep called', () => {
		const iterator = new DiceStringIterator('k5');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(ProcessFunctions, 'processKeepDropModifier');
		let newRoll;
		try {
			newRoll = ProcessFunctions.processRollModifier(iterator, originalRoll);
		}
		finally {
			spy.restore();
		}

		sinon.assert.calledOnce(spy);

		assert.equal(newRoll instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(newRoll.conditions[0](5), true);
		assert.equal(newRoll.isKeep, true);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});

	it('processKeepDropModifier with drop called', () => {
		const iterator = new DiceStringIterator('dl');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(ProcessFunctions, 'processKeepDropModifier');
		let newRoll;
		try {
			newRoll = ProcessFunctions.processRollModifier(iterator, originalRoll);
		}
		finally {
			spy.restore();
		}

		sinon.assert.calledOnce(spy);

		assert.equal(newRoll instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(newRoll.isHigh, false);
		assert.equal(newRoll.isKeep, false);
		assert.equal(newRoll.count, 1);
		assert.deepStrictEqual(newRoll.child, originalRoll);
	});
});

describe('processNumberOrDice Tests', () => {
	it('Empty iterator throws error', () => {
		assert.throws(() => {
			ProcessFunctions.processNumberOrDice('');
		});
	});

	it('Invalid character throws error', () => {
		assert.throws(() => {
			ProcessFunctions.processNumberOrDice('a');
		});
	});

	it('Integer string', () => {
		const result = ProcessFunctions.processNumberOrDice('51');

		assert.equal(result instanceof ParserObjects.StaticNumber, true);
		assert.equal(result.value, 51);
	});

	it('Float string', () => {
		const result = ProcessFunctions.processNumberOrDice('51.15');

		assert.equal(result instanceof ParserObjects.StaticNumber, true);
		assert.equal(result.value, 51.15);
	});

	it('Unnumbered dice string', () => {
		const result = ProcessFunctions.processNumberOrDice('d51');

		assert.equal(result instanceof ParserObjects.DiceRoll, true);
		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 51);
	});

	it('Numbered dice string', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51');

		assert.equal(result instanceof ParserObjects.DiceRoll, true);
		assert.equal(result.numDice, 6);
		assert.equal(result.numSides, 51);
	});

	it('Explosion dice string', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51!');

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Triple ! produces correct explosion chain', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51!!!');

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.child instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Reroll dice string', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51r5');

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Conditional keep dice string', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51k5');

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Ordered drop dice string', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51dh5');

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Modifier chain in the correct order', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51dh5!r<2k3!p=24!!>62');

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child.child instanceof ParserObjects.ReRoll, true);
		assert.equal(result.child.child.child instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.child.child.child.child instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(result.child.child.child.child.child instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.child.child.child.child.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Regular match modifier', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51dh5m');

		assert.equal(result instanceof ParserObjects.NumberMatcher, true);
		assert.equal(!result.resolveToMatchCount, true);
		assert.equal(result.child instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Regular match modifier that returns count', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51mt');

		assert.equal(result instanceof ParserObjects.NumberMatcher, true);
		assert.equal(result.resolveToMatchCount, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Success count', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51=3');

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.successFunc(3), true);
		assert.equal(result.successFunc(4), false);
		assert.equal(!result.failureFunc, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Success & failure count', () => {
		const result = ProcessFunctions.processNumberOrDice('6d51kh4>4f<2');

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.successFunc(5), true);
		assert.equal(result.successFunc(4), false);
		assert.equal(result.failureFunc(1), true);
		assert.equal(result.failureFunc(2), false);
		assert.equal(result.child instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});
});

describe('processBrackets Tests', () => {
	afterEach(() => {
		sinon.restore();
	});
	it('List with success/fail modifiers', () => {
		const brackets = new Brackets(true);
		brackets.modifierSuffix = '>7';
		brackets.elements.push('2d8');
		brackets.elements.push('1d20');
		brackets.elements.push('2d6');

		const result = ProcessFunctions.processBrackets(brackets);

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.child instanceof ParserObjects.NumberList, true);
	});

	it('List with keep/drop modifiers', () => {
		const brackets = new Brackets(true);
		brackets.modifierSuffix = 'kh';
		brackets.elements.push('2d8');
		brackets.elements.push('1d20');
		brackets.elements.push('2d6');

		const result = ProcessFunctions.processBrackets(brackets);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.NumberList, true);
	});
});

describe('ResolveDiceString Tests', () => {
	afterEach(() => {
		sinon.restore();
	});
	it('Simple d10 roll', () => {
		sinon.stub(Math, 'random').returns(0.5);
		const tracker = new TestTracker();
		const result = ResolveDiceString('1d10', tracker);

		assert.equal(result.value, 6);
		assert.equal(result.text, '[6]');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('List drop lowest excludes lowest from result', () => {
		setRollSequence([0.7, 0.4]);
		const tracker = new TestTracker();
		const result = ResolveDiceString('{1d20+5,1d20+5}kh', tracker);

		assert.equal(result.value, 20);
		assert.equal(result.text, '(([15] + 5) + ~~([9] + 5)~~)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('Nested math test', () => {
		setRollSequence([0.7, 0.4]);
		const tracker = new TestTracker();
		const result = ResolveDiceString('(1+3)*2+((7-3)/2)', tracker);

		assert.equal(result.value, 10);
		assert.equal(result.text, '(1 + 3) \\* 2 + ((7 - 3) / 2)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('Single list entry with modifier', () => {
		setRollSequence([0.7, 0.1, 0.9]);
		const tracker = new TestTracker();
		const result = ResolveDiceString('{2d20+1d10}>7', tracker);

		assert.equal(result.value, 2);
		assert.equal(result.text, '(__[15]__ + [3] + __[10]__)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.SUCCESS_FAIL);
	});

	it('Single list entry with modifier', () => {
		setRollSequence([0.7, 0.6, 0.1]);
		const tracker = new TestTracker();
		const result = ResolveDiceString('{3d20+5}>10', tracker);

		assert.equal(result.value, 1);
		assert.equal(result.text, '(([15] + [13] + [3]) + 5)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.SUCCESS_FAIL);
	});

	it('Discards within discards', () => {
		setRollSequence([0.7, 0.1, 0.6, 0.5]);
		const tracker = new TestTracker();
		const result = ResolveDiceString('{1d10ro>5,2d10}dl', tracker);

		assert.equal(result.value, 13);
		assert.equal(result.text, '(~~([8] + [2])~~ + ([7] + [6]))');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('Number to the power of brackets plus a number', () => {
		const tracker = new TestTracker();
		// This string looks innocent but it crates specific challenges
		// for the math folding that can cause errors.
		const result = ResolveDiceString('1^(3-2)+3', tracker);

		assert.equal(result.value, 4);
		assert.equal(result.text, '1 ^ (3 - 2) + 3');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});
});

function setRollSequence(sequence) {
	let idx = -1;
	sinon.stub(Math, 'random').callsFake(() => {
		idx++;
		return sequence[idx];
	});
}

class TestTracker {
	constructor() {
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
	}
}