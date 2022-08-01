/* eslint-disable no-undef */
const assert = require('assert');
const { DiceStringIterator } = require('../parser.iterator');
const { isIntChar, processInt } = require('../parser.processing.numbers');

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
			processInt(iterator);
		});
	});

	it('Not integer throws error', () => {
		const iterator = new DiceStringIterator('.');
		assert.throws(() => {
			processInt(iterator);
		});
	});

	it('Single char int is read', () => {
		const iterator = new DiceStringIterator('5');
		assert.equal(processInt(iterator), 5);
	});

	it('Multi-char int is read', () => {
		const iterator = new DiceStringIterator('12345');
		assert.equal(processInt(iterator), 12345);
	});

	it('Stops at non-int chars', () => {
		const iterator = new DiceStringIterator('123.45');
		assert.equal(processInt(iterator), 123);
		assert.equal(iterator.next().value, '.');
	});

	it('Starts at current iterator position', () => {
		const iterator = new DiceStringIterator('12345');
		iterator.next();
		iterator.next();
		assert.equal(processInt(iterator), 345);
	});

	it('Regular negative number', () => {
		const iterator = new DiceStringIterator('-123');
		assert.equal(processInt(iterator), -123);
	});

	it('"-" after start of string causes error', () => {
		const iterator = new DiceStringIterator('1-23');
		assert.throws(() => {
			processInt(iterator);
		});
	});
});