/* eslint-disable no-undef */
const assert = require('assert');
const sinon = require('sinon');
const ParserObjects = require('../parser/resolution/parser.resolution.objects');
const { Brackets } = require('../parser/carving/parser.carving');
const { processNumberOrDice, processBrackets } = require('../parser/processing/parser.processing');

describe('processNumberOrDice Tests', () => {
	it('Empty iterator throws error', () => {
		assert.throws(() => {
			processNumberOrDice('');
		});
	});

	it('Invalid character throws error', () => {
		assert.throws(() => {
			processNumberOrDice('a');
		});
	});

	it('Integer string', () => {
		const result = processNumberOrDice('51');

		assert.equal(result instanceof ParserObjects.StaticNumber, true);
		assert.equal(result.value, 51);
	});

	it('Float string', () => {
		const result = processNumberOrDice('51.15');

		assert.equal(result instanceof ParserObjects.StaticNumber, true);
		assert.equal(result.value, 51.15);
	});

	it('Unnumbered dice string', () => {
		const result = processNumberOrDice('d51');

		assert.equal(result instanceof ParserObjects.DiceRoll, true);
		assert.equal(result.numDice, 1);
		assert.equal(result.numSides, 51);
	});

	it('Numbered dice string', () => {
		const result = processNumberOrDice('6d51');

		assert.equal(result instanceof ParserObjects.DiceRoll, true);
		assert.equal(result.numDice, 6);
		assert.equal(result.numSides, 51);
	});

	it('Explosion dice string', () => {
		const result = processNumberOrDice('6d51!');

		assert.equal(result instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Triple ! produces correct explosion chain', () => {
		const result = processNumberOrDice('6d51!!!');

		assert.equal(result instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.child instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Reroll dice string', () => {
		const result = processNumberOrDice('6d51r5');

		assert.equal(result instanceof ParserObjects.ReRoll, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Conditional keep dice string', () => {
		const result = processNumberOrDice('6d51k5');

		assert.equal(result instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Ordered drop dice string', () => {
		const result = processNumberOrDice('6d51dh5');

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Modifier chain in the correct order', () => {
		const result = processNumberOrDice('6d51dh5!r<2k3!p=24!!>62');

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.DiceExplosionRegular, true);
		assert.equal(result.child.child instanceof ParserObjects.ReRoll, true);
		assert.equal(result.child.child.child instanceof ParserObjects.KeepDropConditional, true);
		assert.equal(result.child.child.child.child instanceof ParserObjects.DiceExplosionPenetrating, true);
		assert.equal(result.child.child.child.child.child instanceof ParserObjects.DiceExplosionCompounding, true);
		assert.equal(result.child.child.child.child.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Regular match modifier', () => {
		const result = processNumberOrDice('6d51dh5m');

		assert.equal(result instanceof ParserObjects.NumberMatcher, true);
		assert.equal(!result.resolveToMatchCount, true);
		assert.equal(result.child instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Regular match modifier that returns count', () => {
		const result = processNumberOrDice('6d51mt');

		assert.equal(result instanceof ParserObjects.NumberMatcher, true);
		assert.equal(result.resolveToMatchCount, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Success count', () => {
		const result = processNumberOrDice('6d51=3');

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.successFunc(3), true);
		assert.equal(result.successFunc(4), false);
		assert.equal(!result.failureFunc, true);
		assert.equal(result.child instanceof ParserObjects.DiceRoll, true);
	});

	it('Success & failure count', () => {
		const result = processNumberOrDice('6d51kh4>4f<2');

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

		const result = processBrackets(brackets);

		assert.equal(result instanceof ParserObjects.SuccessFailCounter, true);
		assert.equal(result.child instanceof ParserObjects.NumberList, true);
	});

	it('List with keep/drop modifiers', () => {
		const brackets = new Brackets(true);
		brackets.modifierSuffix = 'kh';
		brackets.elements.push('2d8');
		brackets.elements.push('1d20');
		brackets.elements.push('2d6');

		const result = processBrackets(brackets);

		assert.equal(result instanceof ParserObjects.KeepDropHighLow, true);
		assert.equal(result.child instanceof ParserObjects.NumberList, true);
	});
});