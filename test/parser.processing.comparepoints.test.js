/* eslint-disable no-undef */
const assert = require('assert');
const { DiceStringIterator } = require('../parser.iterator');
const { processModifierComparePoint } = require('../parser.processing.comparepoints');

describe('processModifierComparePoint Tests', () => {
	it('Empty iterator throws error', () => {
		const iterator = new DiceStringIterator('');
		assert.throws(() => {
			processModifierComparePoint(iterator);
		});
	});

	it('Integer checks for specific value', () => {
		const iterator = new DiceStringIterator('15');
		const compareFunc = processModifierComparePoint(iterator);

		assert.equal(compareFunc(15), true);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), false);
	});

	it('No following number throws error', () => {
		let iterator = new DiceStringIterator('=');
		assert.throws(() => {
			processModifierComparePoint(iterator);
		});

		iterator = new DiceStringIterator('>');
		assert.throws(() => {
			processModifierComparePoint(iterator);
		});

		iterator = new DiceStringIterator('<');
		assert.throws(() => {
			processModifierComparePoint(iterator);
		});
	});

	it('= checks for specific value', () => {
		const iterator = new DiceStringIterator('=15');
		const compareFunc = processModifierComparePoint(iterator);

		assert.equal(compareFunc(15), true);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), false);
	});

	it('< checks for lower value', () => {
		const iterator = new DiceStringIterator('<15');
		const compareFunc = processModifierComparePoint(iterator);

		assert.equal(compareFunc(15), false);
		assert.equal(compareFunc(14), true);
		assert.equal(compareFunc(16), false);
	});

	it('> checks for higher value', () => {
		const iterator = new DiceStringIterator('>15');
		const compareFunc = processModifierComparePoint(iterator);

		assert.equal(compareFunc(15), false);
		assert.equal(compareFunc(14), false);
		assert.equal(compareFunc(16), true);
	});
});