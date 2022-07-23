/* eslint-disable no-undef */
const assert = require('assert');
const parser = require('../parser');
const ParserObjects = require('../parser-objects');
const sinon = require('sinon');

describe('Roll Parser Standardization', () => {
	it('Remove spaces', () => {
		assert.equal(parser.standardizeDiceString(' 1 2 3 '), '123');
	});

	it('Remove new lines', () => {
		assert.equal(parser.standardizeDiceString('\r\n1\r\n2\r\n3\r\n'), '123');
	});

	it('Remove tabs', () => {
		assert.equal(parser.standardizeDiceString('\t1\t2\t3\t'), '123');
	});

	it('Lower case', () => {
		assert.equal(parser.standardizeDiceString('ABC123'), 'abc123');
	});
});

describe('StringIterator Tests', () => {
	it('Empty string immediately done', () => {
		const text = '';
		const iterator = new parser.DiceStringIterator(text);

		assert.equal(iterator.next().done, true);
	});

	it('Empty string peek is done', () => {
		const text = '';
		const iterator = new parser.DiceStringIterator(text);

		assert.equal(iterator.peek().done, true);
	});

	it('All characters match', () => {
		const text = 'abc123';
		const iterator = new parser.DiceStringIterator(text);

		for (let i = 0; i < text.length; i++) {
			assert.equal(iterator.next().value, text[i]);
		}
	});

	it('Iterator terminates', () => {
		const text = 'abc123';
		const iterator = new parser.DiceStringIterator(text);

		let i = 0;
		while (!iterator.next().done) {
			i++;
		}

		assert.equal(i, 6);
	});

	it('Peeks match next', () => {
		const text = 'abc123';
		const iterator = new parser.DiceStringIterator(text);

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
		assert.equal(parser.isIntChar({}.value), false);
	});

	it('Not int char returns false', () => {
		assert.equal(parser.isIntChar('.'), false);
	});

	it('Numbers return true', () => {
		assert.equal(parser.isIntChar('0'), true);
		assert.equal(parser.isIntChar('1'), true);
		assert.equal(parser.isIntChar('2'), true);
		assert.equal(parser.isIntChar('3'), true);
		assert.equal(parser.isIntChar('4'), true);
		assert.equal(parser.isIntChar('5'), true);
		assert.equal(parser.isIntChar('6'), true);
		assert.equal(parser.isIntChar('7'), true);
		assert.equal(parser.isIntChar('8'), true);
		assert.equal(parser.isIntChar('9'), true);
		assert.equal(parser.isIntChar('-'), true);
	});
});

describe('processInt Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new parser.DiceStringIterator('');
		assert.throws(() => {
			parser.ProcessFunctions.processInt(iterator);
		});
	});

	it('Not integer throws error', () => {
		const iterator = new parser.DiceStringIterator('.');
		assert.throws(() => {
			parser.ProcessFunctions.processInt(iterator);
		});
	});

	it('Single char int is read', () => {
		const iterator = new parser.DiceStringIterator('5');
		assert.equal(parser.ProcessFunctions.processInt(iterator), 5);
	});

	it('Multi-char int is read', () => {
		const iterator = new parser.DiceStringIterator('12345');
		assert.equal(parser.ProcessFunctions.processInt(iterator), 12345);
	});

	it('Stops at non-int chars', () => {
		const iterator = new parser.DiceStringIterator('123.45');
		assert.equal(parser.ProcessFunctions.processInt(iterator), 123);
		assert.equal(iterator.next().value, '.');
	});

	it('Starts at current iterator position', () => {
		const iterator = new parser.DiceStringIterator('12345');
		iterator.next();
		iterator.next();
		assert.equal(parser.ProcessFunctions.processInt(iterator), 345);
	});

	it('Regular negative number', () => {
		const iterator = new parser.DiceStringIterator('-123');
		assert.equal(parser.ProcessFunctions.processInt(iterator), -123);
	});

	it('"-" after start of string causes error', () => {
		const iterator = new parser.DiceStringIterator('1-23');
		assert.throws(() => {
			parser.ProcessFunctions.processInt(iterator);
		});
	});
});

describe('processSimpleDiceString Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new parser.DiceStringIterator('');
		assert.throws(() => {
			parser.ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if not started with a "d"', () => {
		const iterator = new parser.DiceStringIterator('a6');
		assert.throws(() => {
			parser.ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if nothing after "d"', () => {
		const iterator = new parser.DiceStringIterator('d');
		assert.throws(() => {
			parser.ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Throws an error if "d" not followed by a number or "f"', () => {
		const iterator = new parser.DiceStringIterator('da');
		assert.throws(() => {
			parser.ProcessFunctions.processSimpleDiceString(iterator);
		});
	});

	it('Single digit regular die', () => {
		const iterator = new parser.DiceStringIterator('d6');
		const result = parser.ProcessFunctions.processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 6);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Multi-digit regular die', () => {
		const iterator = new parser.DiceStringIterator('d20');
		const result = parser.ProcessFunctions.processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 20);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Multiple regular dice', () => {
		const iterator = new parser.DiceStringIterator('d20');
		const result = parser.ProcessFunctions.processSimpleDiceString(iterator, 3);

		assert.equal(result.numDice, 3);
		assert.equal(result.numSides, 20);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Single fudge die', () => {
		const iterator = new parser.DiceStringIterator('df');
		const result = parser.ProcessFunctions.processSimpleDiceString(iterator, 1);

		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 1);
		assert.equal(result.minValue, -1);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});

	it('Multiple fudge dice', () => {
		const iterator = new parser.DiceStringIterator('df');
		const result = parser.ProcessFunctions.processSimpleDiceString(iterator, 3);

		assert.equal(result.numDice, 3);
		assert.equal(result.numSides, 1);
		assert.equal(result.minValue, -1);
		assert.equal(result.getResolveType(), ParserObjects.ParserResolveTypes.DICE_ROLL);
	});
});

describe('processComparePoint Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new parser.DiceStringIterator('');
		assert.throws(() => {
			parser.ProcessFunctions.processComparePoint(iterator);
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new parser.DiceStringIterator('5');
		assert.throws(() => {
			parser.ProcessFunctions.processComparePoint(iterator);
		});
	});

	it('No following number throws error', () => {
		let iterator = new parser.DiceStringIterator('=');
		assert.throws(() => {
			parser.ProcessFunctions.processComparePoint(iterator);
		});

		iterator = new parser.DiceStringIterator('>');
		assert.throws(() => {
			parser.ProcessFunctions.processComparePoint(iterator);
		});

		iterator = new parser.DiceStringIterator('<');
		assert.throws(() => {
			parser.ProcessFunctions.processComparePoint(iterator);
		});
	});

	it('= checks for specific value', () => {
		const iterator = new parser.DiceStringIterator('=15');
		const compareFunc = parser.ProcessFunctions.processComparePoint(iterator);

		assert.equal(compareFunc(15), true);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), false);
	});

	it('< checks for lower value', () => {
		const iterator = new parser.DiceStringIterator('<15');
		const compareFunc = parser.ProcessFunctions.processComparePoint(iterator);

		assert.equal(compareFunc(15), false);
		assert.equal(compareFunc(14), true);
		assert.equal(compareFunc(16), false);
	});

	it('> checks for higher value', () => {
		const iterator = new parser.DiceStringIterator('>15');
		const compareFunc = parser.ProcessFunctions.processComparePoint(iterator);

		assert.equal(compareFunc(15), false);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), true);
	});
});

describe('processModifierComparePoint Tests', () => {
	it('Integer checks for specific value', () => {
		const iterator = new parser.DiceStringIterator('15');
		const compareFunc = parser.ProcessFunctions.processModifierComparePoint(iterator);

		assert.equal(compareFunc(15), true);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), false);
	});

	it('Non-number calls processComparePoint', () => {
		const iterator = new parser.DiceStringIterator('');
		const spy = sinon.spy(parser.ProcessFunctions, 'processModifierComparePoint');

		try {
			assert.throws(() => {
				parser.ProcessFunctions.processModifierComparePoint(iterator);
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
		const iterator = new parser.DiceStringIterator('');
		assert.throws(() => {
			parser.ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new parser.DiceStringIterator('5');
		assert.throws(() => {
			parser.ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('"k" or "d" not followed by number throws error', () => {
		let iterator = new parser.DiceStringIterator('k');
		assert.throws(() => {
			parser.ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});

		iterator = new parser.DiceStringIterator('d');
		assert.throws(() => {
			parser.ProcessFunctions.processKeepDropModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Specific keep', () => {
		const iterator = new parser.DiceStringIterator('k5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Specific keep chain', () => {
		const iterator = new parser.DiceStringIterator('k5k3k2');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions.length, 3);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.conditions[1](3), true);
		assert.equal(result.conditions[2](2), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep high breaks keep chain', () => {
		const iterator = new parser.DiceStringIterator('k5kh3k2');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions.length, 1);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Specific drop', () => {
		const iterator = new parser.DiceStringIterator('d5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.conditions[0](5), true);
		assert.equal(result.isKeep, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default keep high', () => {
		const iterator = new parser.DiceStringIterator('kh');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default drop high', () => {
		const iterator = new parser.DiceStringIterator('dh');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default keep low', () => {
		const iterator = new parser.DiceStringIterator('kl');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Default drop low', () => {
		const iterator = new parser.DiceStringIterator('dl');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 1);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep high with count', () => {
		const iterator = new parser.DiceStringIterator('kh3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Drop high with count', () => {
		const iterator = new parser.DiceStringIterator('dh3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, true);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Keep low with count', () => {
		const iterator = new parser.DiceStringIterator('kl3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, true);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Drop low with count', () => {
		const iterator = new parser.DiceStringIterator('dl3');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processKeepDropModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.isHigh, false);
		assert.equal(result.isKeep, false);
		assert.equal(result.count, 3);
		assert.deepStrictEqual(result.child, roll);
	});
});

describe('processRerollModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new parser.DiceStringIterator('');
		assert.throws(() => {
			parser.ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Starts with invalid character throws error', () => {
		const iterator = new parser.DiceStringIterator('5');
		assert.throws(() => {
			parser.ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('No compare point throws error', () => {
		let iterator = new parser.DiceStringIterator('r');
		assert.throws(() => {
			parser.ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});

		iterator = new parser.DiceStringIterator('ro');
		assert.throws(() => {
			parser.ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Regular reroll', () => {
		const iterator = new parser.DiceStringIterator('r5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.onlyOnce, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Reroll once', () => {
		const iterator = new parser.DiceStringIterator('ro5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.onlyOnce, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Regular reroll chain', () => {
		const iterator = new parser.DiceStringIterator('r5r3r>9');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.conditionMatches(3), true);
		assert.equal(result.conditionMatches(10), true);
		assert.equal(result.onlyOnce, false);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Reroll once chain', () => {
		const iterator = new parser.DiceStringIterator('ro5ro3ro>9');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processRerollModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.conditionMatches(5), true);
		assert.equal(result.conditionMatches(3), true);
		assert.equal(result.conditionMatches(10), true);
		assert.equal(result.onlyOnce, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Mixing reroll and reroll once breaks condition chain', () => {
		let iterator = new parser.DiceStringIterator('r5ro3');
		const result1 = parser.ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));

		assert.equal(!result1.onlyOnce, true);
		assert.equal(result1.conditions.length, 1);
		assert.equal(result1.conditions[0](3), false);

		iterator = new parser.DiceStringIterator('ro5r3');
		const result2 = parser.ProcessFunctions.processRerollModifier(iterator, new ParserObjects.DiceRoll(1, 6));

		assert.equal(result2.onlyOnce, true);
		assert.equal(result2.conditions.length, 1);
		assert.equal(result2.conditions[0](3), false);
	});
});

describe('processExplosionModifier Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new parser.DiceStringIterator('');
		assert.throws(() => {
			parser.ProcessFunctions.processExplosionModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Invalid character throws error', () => {
		const iterator = new parser.DiceStringIterator('5');
		assert.throws(() => {
			parser.ProcessFunctions.processExplosionModifier(iterator, new ParserObjects.DiceRoll(1, 6));
		});
	});

	it('Regular unmodified explosion', () => {
		const iterator = new parser.DiceStringIterator('!');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Regular explosion with condition', () => {
		const iterator = new parser.DiceStringIterator('!5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Compounding unmodified explosion', () => {
		const iterator = new parser.DiceStringIterator('!!');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Compounding explosion with condition', () => {
		const iterator = new parser.DiceStringIterator('!!5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Penetrating unmodified explosion', () => {
		const iterator = new parser.DiceStringIterator('!p');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(!result.condition, true);
		assert.deepStrictEqual(result.child, roll);
	});

	it('Penetrating explosion with condition', () => {
		const iterator = new parser.DiceStringIterator('!p5');
		const roll = new ParserObjects.DiceRoll(1, 6);
		const result = parser.ProcessFunctions.processExplosionModifier(iterator, roll);

		assert.equal(result instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(result.condition(5), true);
		assert.deepStrictEqual(result.child, roll);
	});
});

describe('processRollModifier Tests', () => {
	it('Empty iterator returns same dice roll', () => {
		const iterator = new parser.DiceStringIterator('');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);
		const newRoll = parser.ProcessFunctions.processRollModifier(iterator, originalRoll);

		assert.deepStrictEqual(newRoll, originalRoll);
	});

	it('processExplosionModifier called', () => {
		const iterator = new parser.DiceStringIterator('!');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(parser.ProcessFunctions, 'processExplosionModifier');
		let newRoll;
		try {
			newRoll = parser.ProcessFunctions.processRollModifier(iterator, originalRoll);
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
		const iterator = new parser.DiceStringIterator('r5');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(parser.ProcessFunctions, 'processRerollModifier');
		let newRoll;
		try {
			newRoll = parser.ProcessFunctions.processRollModifier(iterator, originalRoll);
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
		const iterator = new parser.DiceStringIterator('k5');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(parser.ProcessFunctions, 'processKeepDropModifier');
		let newRoll;
		try {
			newRoll = parser.ProcessFunctions.processRollModifier(iterator, originalRoll);
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
		const iterator = new parser.DiceStringIterator('dl');
		const originalRoll = new ParserObjects.DiceRoll(1, 6);

		const spy = sinon.spy(parser.ProcessFunctions, 'processKeepDropModifier');
		let newRoll;
		try {
			newRoll = parser.ProcessFunctions.processRollModifier(iterator, originalRoll);
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
			parser.ProcessFunctions.processNumberOrDice('');
		});
	});

	it('Invalid character throws error', () => {
		assert.throws(() => {
			parser.ProcessFunctions.processNumberOrDice('a');
		});
	});

	it('Integer string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('51');

		assert.equal(result instanceof ParserObjects.StaticNumber, true);
		assert.equal(result.value, 51);
	});

	it('Float string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('51.15');

		assert.equal(result instanceof ParserObjects.StaticNumber, true);
		assert.equal(result.value, 51.15);
	});

	it('Unnumbered dice string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('d51');

		assert.equal(result instanceof ParserObjects.DiceRoll, true);
		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 51);
	});

	it('Numbered dice string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51');

		assert.equal(result instanceof ParserObjects.DiceRoll, true);
		assert.equal(result.numDice, 6);
		assert.equal(result.numSides, 51);
	});

	it('Explosion dice string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51!');

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Triple ! produces correct explosion chain', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51!!!');

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.child instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Reroll dice string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51r5');

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Conditional keep dice string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51k5');

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Ordered drop dice string', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51dh5');

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Modifier chain in the correct order', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51dh5!r<2k3!p=24!!>62');

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child.child instanceof ParserObjects.ReRoll, true);
		assert.equal(result.child.child.child instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.child.child.child.child instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(result.child.child.child.child.child instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.child.child.child.child.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Regular match modifier', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51dh5m');

		assert.equal(result instanceof ParserObjects.NumberMatcher, true);
		assert.equal(!result.resolveToMatchCount, true);
		assert.equal(result.child instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Regular match modifier that returns count', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51mt');

		assert.equal(result instanceof ParserObjects.NumberMatcher, true);
		assert.equal(result.resolveToMatchCount, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Success count', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51=3');

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.successFunc(3), true);
		assert.equal(result.successFunc(4), false);
		assert.equal(!result.failureFunc, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Success & failure count', () => {
		const result = parser.ProcessFunctions.processNumberOrDice('6d51kh4>4f<2');

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.successFunc(5), true);
		assert.equal(result.successFunc(4), false);
		assert.equal(result.failureFunc(1), true);
		assert.equal(result.failureFunc(2), false);
		assert.equal(result.child instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});
});

describe('carveMathString Tests', () => {
	it('Empty string gives empty response', () => {
		const result = parser.carveMathString('');
		assert.equal(result, '');
	});

	it('String without operators returns same string', () => {
		const result = parser.carveMathString('abc123');
		assert.equal(result, 'abc123');
	});

	it('String with only "+" returns math object dividing empty strings', () => {
		const result = parser.carveMathString('+');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "-" returns math object dividing empty strings', () => {
		const result = parser.carveMathString('-', true);
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '-');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "*" returns math object dividing empty strings', () => {
		const result = parser.carveMathString('*');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "/" returns math object dividing empty strings', () => {
		const result = parser.carveMathString('/');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '/');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "%" returns math object dividing empty strings', () => {
		const result = parser.carveMathString('%');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '%');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "^" returns math object dividing empty strings', () => {
		const result = parser.carveMathString('^');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '^');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with one "+" returns strings on either side', () => {
		const result = parser.carveMathString('123abc+123abc');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.left, '123abc');
		assert.equal(result.right, '123abc');
	});


	it('String with multiple "+" returns chain of math functions', () => {
		const result = parser.carveMathString('a+b+c');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.right, 'c');
		assert.equal(result.left instanceof parser.MathFunction, true);
		assert.equal(result.left.symbol, '+');
		assert.equal(result.left.left, 'a');
		assert.equal(result.left.right, 'b');
	});

	it('String with multiple "^" returns chain folded in opposite direction', () => {
		const result = parser.carveMathString('a^b^c');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '^');
		assert.equal(result.left, 'a');
		assert.equal(result.right instanceof parser.MathFunction, true);
		assert.equal(result.right.symbol, '^');
		assert.equal(result.right.left, 'b');
		assert.equal(result.right.right, 'c');
	});

	it('Layered operators parse in correct order', () => {
		const result = parser.carveMathString('5^6*3+2');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.right, '2');
		assert.equal(result.left instanceof parser.MathFunction, true);
		assert.equal(result.left.symbol, '*');
		assert.equal(result.left.right, '3');
		assert.equal(result.left.left instanceof parser.MathFunction, true);
		assert.equal(result.left.left.symbol, '^');
		assert.equal(result.left.left.right, '6');
		assert.equal(result.left.left.left, '5');
	});

	it('Simple negative number', () => {
		const result = parser.carveMathString('-4');
		assert.equal(result, '-4');
	});

	it('Multiply negative number', () => {
		const result = parser.carveMathString('-4*5');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.left, '-4');
		assert.equal(result.right, '5');
	});

	it('Multiply by negative number', () => {
		const result = parser.carveMathString('5*-4');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.left, '5');
		assert.equal(result.right, '-4');
	});

	it('Negative number minus negative number', () => {
		const result = parser.carveMathString('-5--4');
		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '-');
		assert.equal(result.left, '-5');
		assert.equal(result.right, '-4');
	});
});

describe('carveDiceStringByBrackets Tests', () => {
	it('Empty string produces empty bracket object', () => {
		const iterator = new parser.DiceStringIterator('');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(!result, true);
	});

	it('Single open bracket causes error', () => {
		const iterator = new parser.DiceStringIterator('(');
		assert.throws(() => {
			parser.CarvingFunctions.carveDiceStringByBrackets(iterator);
		});
	});

	it('Single close bracket causes error', () => {
		const iterator = new parser.DiceStringIterator(')');
		assert.throws(() => {
			parser.CarvingFunctions.carveDiceStringByBrackets(iterator);
		});
	});

	it('Simple bracket pair produces empty bracket inside bracket', () => {
		const iterator = new parser.DiceStringIterator('()');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(result.elements.length, 0);
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(!result.isList, true);
		assert.equal(result.terminatingChar, ')');
	});

	it('Simple empty list', () => {
		const iterator = new parser.DiceStringIterator('{}');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(result.elements.length, 0);
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(result.isList, true);
		assert.equal(!result.terminatingChar, true);
	});

	it('Simple list with 2 empty entries does not get entries', () => {
		const iterator = new parser.DiceStringIterator('{,}');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(result.elements.length, 0);
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(result.isList, true);
		assert.equal(!result.terminatingChar, true);
	});

	it('Simple list with 2 entries', () => {
		const iterator = new parser.DiceStringIterator('{a,b}');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(result.elements.length, 2);
		assert.equal(result.elements[0].elements[0], 'a');
		assert.equal(result.elements[1].elements[0], 'b');
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(result.isList, true);
		assert.equal(!result.terminatingChar, true);
	});

	it('Basic math parsed', () => {
		const iterator = new parser.DiceStringIterator('a+b');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.left, 'a');
		assert.equal(result.right, 'b');
	});

	it('Following brackets break math parsing order', () => {
		const iterator = new parser.DiceStringIterator('a^(b+c)');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '^');
		assert.equal(result.left, 'a');

		assert.equal(result.right instanceof parser.Brackets, true);
		assert.equal(result.right.elements.length, 1);
		assert.equal(result.right.elements[0] instanceof parser.MathFunction, true);
		assert.equal(result.right.elements[0].symbol, '+');
		assert.equal(result.right.elements[0].left, 'b');
		assert.equal(result.right.elements[0].right, 'c');
	});

	it('Leading brackets break math parsing order', () => {
		const iterator = new parser.DiceStringIterator('(a+b)*c');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.right, 'c');

		assert.equal(result.left instanceof parser.Brackets, true);
		assert.equal(result.left.elements.length, 1);
		assert.equal(result.left.elements[0] instanceof parser.MathFunction, true);
		assert.equal(result.left.elements[0].symbol, '+');
		assert.equal(result.left.elements[0].left, 'a');
		assert.equal(result.left.elements[0].right, 'b');
	});

	it('Single element list with mods', () => {
		const iterator = new parser.DiceStringIterator('{5d6}>-1');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(result.isList, true);
		assert.equal(result.modifierSuffix, '>-1');
		assert.equal(result.elements.length, 1);

		assert.equal(result.elements[0] instanceof parser.Brackets, true);
		assert.equal(result.elements[0].elements[0], '5d6');
	});

	it('Multi element list with mods', () => {
		const iterator = new parser.DiceStringIterator('{2d8,1d10,2d6}>7');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(result.isList, true);
		assert.equal(result.modifierSuffix, '>7');
		assert.equal(result.elements.length, 3);

		assert.equal(result.elements[0] instanceof parser.Brackets, true);
		assert.equal(result.elements[0].elements[0], '2d8');
		assert.equal(result.elements[1] instanceof parser.Brackets, true);
		assert.equal(result.elements[1].elements[0], '1d10');
		assert.equal(result.elements[2] instanceof parser.Brackets, true);
		assert.equal(result.elements[2].elements[0], '2d6');
	});

	it('Single element list with mods followed by minus', () => {
		const iterator = new parser.DiceStringIterator('{5d6}>3-1');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.MathFunction, true);
		assert.equal(result.symbol, '-');
		assert.equal(result.right, '1');

		assert.equal(result.left instanceof parser.Brackets, true);
		assert.equal(result.left.isList, true);
		assert.equal(result.left.modifierSuffix, '>3');
		assert.equal(result.left.elements.length, 1);

		assert.equal(result.left.elements[0] instanceof parser.Brackets, true);
		assert.equal(result.left.elements[0].elements[0], '5d6');
	});

	it('Simple floor method', () => {
		const iterator = new parser.DiceStringIterator('floor(-5.5)');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'floor');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Simple round method', () => {
		const iterator = new parser.DiceStringIterator('round(-5.5)');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'round');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Simple ceil method', () => {
		const iterator = new parser.DiceStringIterator('ceil(-5.5)');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'ceil');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Simple abs method', () => {
		const iterator = new parser.DiceStringIterator('abs(-5.5)');
		const result = parser.CarvingFunctions.carveDiceStringByBrackets(iterator);

		assert.equal(result instanceof parser.Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'abs');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Function using list brackets throws error', () => {
		const iterator = new parser.DiceStringIterator('floor{-5.5}');
		assert.throws(() => {
			parser.CarvingFunctions.carveDiceStringByBrackets(iterator);
		});
	});
});

describe('processBrackets Tests', () => {
	afterEach(() => {
		sinon.restore();
	});
	it('List with success/fail modifiers', () => {
		const brackets = new parser.Brackets(true);
		brackets.modifierSuffix = '>7';
		brackets.elements.push('2d8');
		brackets.elements.push('1d20');
		brackets.elements.push('2d6');

		const result = parser.ProcessFunctions.processBrackets(brackets);

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.child instanceof ParserObjects.NumberList, true);
	});

	it('List with keep/drop modifiers', () => {
		const brackets = new parser.Brackets(true);
		brackets.modifierSuffix = 'kh';
		brackets.elements.push('2d8');
		brackets.elements.push('1d20');
		brackets.elements.push('2d6');

		const result = parser.ProcessFunctions.processBrackets(brackets);

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
		const result = parser.ResolveDiceString('1d10', tracker);

		assert.equal(result.value, 6);
		assert.equal(result.text, '[6]');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('List drop lowest excludes lowest from result', () => {
		setRollSequence([0.7, 0.4]);
		const tracker = new TestTracker();
		const result = parser.ResolveDiceString('{1d20+5,1d20+5}kh', tracker);

		assert.equal(result.value, 20);
		assert.equal(result.text, '(([15] + 5) + ~~([9] + 5)~~)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('Nested math test', () => {
		setRollSequence([0.7, 0.4]);
		const tracker = new TestTracker();
		const result = parser.ResolveDiceString('(1+3)*2+((7-3)/2)', tracker);

		assert.equal(result.value, 10);
		assert.equal(result.text, '(1 + 3) \\* 2 + ((7 - 3) / 2)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.UNTYPED);
	});

	it('Single list entry with modifier', () => {
		setRollSequence([0.7, 0.1, 0.9]);
		const tracker = new TestTracker();
		const result = parser.ResolveDiceString('{2d20+1d10}>7', tracker);

		assert.equal(result.value, 2);
		assert.equal(result.text, '(__[15]__ + [3] + __[10]__)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.SUCCESS_FAIL);
	});

	it('Single list entry with modifier', () => {
		setRollSequence([0.7, 0.6, 0.1]);
		const tracker = new TestTracker();
		const result = parser.ResolveDiceString('{3d20+5}>10', tracker);

		assert.equal(result.value, 1);
		assert.equal(result.text, '(([15] + [13] + [3]) + 5)');
		assert.equal(result.type, ParserObjects.ResolvedNumberType.SUCCESS_FAIL);
	});

	it('Discards within discards', () => {
		setRollSequence([0.7, 0.1, 0.6, 0.5]);
		const tracker = new TestTracker();
		const result = parser.ResolveDiceString('{1d10ro>5,2d10}dl', tracker);

		assert.equal(result.value, 13);
		assert.equal(result.text, '(~~([8] + [2])~~ + ([7] + [6]))');
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