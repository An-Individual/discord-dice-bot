/* eslint-disable no-undef */
const assert = require('assert');
const sinon = require('sinon');
const { resolveDiceString, standardizeDiceString } = require('../parser/parser');
const { DiceStringIterator } = require('../parser/parser.iterator');
const { TestTracker, TestFormatter } = require('./fake-objects');
const { ResolvedNumberType } = require('../parser/parser.constants');

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

describe('resolveDiceString Tests', () => {
	afterEach(() => {
		sinon.restore();
	});

	it('Empty string gives 0 output', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('', tracker, formatter);

		assert.equal(result.value, 0);
		assert.equal(result.text, '');
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
	});

	it('Simple d10 roll', () => {
		sinon.stub(Math, 'random').returns(0.5);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('1d10', tracker, formatter);

		assert.equal(result.value, 6);
		assert.equal(result.text, '[6]');
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
	});

	it('List drop lowest excludes lowest from result', () => {
		setRollSequence([0.7, 0.4]);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('{1d20+5,1d20+5}kh', tracker, formatter);

		assert.equal(result.value, 20);
		assert.equal(result.text, '(([15] + 5) + ~~([9] + 5)~~)');
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
	});

	it('Nested math test', () => {
		setRollSequence([0.7, 0.4]);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('(1+3)*2+((7-3)/2)', tracker, formatter);

		assert.equal(result.value, 10);
		assert.equal(result.text, '(1 + 3) \\* 2 + ((7 - 3) / 2)');
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
	});

	it('Single list entry with modifier', () => {
		setRollSequence([0.7, 0.1, 0.9]);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('{2d20+1d10}>7', tracker, formatter);

		assert.equal(result.value, 2);
		assert.equal(result.text, '(__[15]__ + [3] + __[10]__)');
		assert.equal(result.type, ResolvedNumberType.SUCCESS_FAIL);
	});

	it('Single list entry with modifier', () => {
		setRollSequence([0.7, 0.6, 0.1]);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('{3d20+5}>10', tracker, formatter);

		assert.equal(result.value, 1);
		assert.equal(result.text, '(([15] + [13] + [3]) + 5)');
		assert.equal(result.type, ResolvedNumberType.SUCCESS_FAIL);
	});

	it('Discards within discards', () => {
		setRollSequence([0.7, 0.1, 0.6, 0.5]);
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		const result = resolveDiceString('{1d10ro>5,2d10}dl', tracker, formatter);

		assert.equal(result.value, 13);
		assert.equal(result.text, '(~~([8] + [2])~~ + ([7] + [6]))');
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
	});

	it('Number to the power of brackets plus a number', () => {
		const tracker = new TestTracker();
		const formatter = new TestFormatter();
		// This string looks innocent but it crates specific challenges
		// for the math folding that can cause errors.
		const result = resolveDiceString('1^(3-2)+3', tracker, formatter);

		assert.equal(result.value, 4);
		assert.equal(result.text, '1 ^ (3 - 2) + 3');
		assert.equal(result.type, ResolvedNumberType.UNTYPED);
	});
});

function setRollSequence(sequence) {
	let idx = -1;
	sinon.stub(Math, 'random').callsFake(() => {
		idx++;
		return sequence[idx];
	});
}