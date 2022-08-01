/* eslint-disable no-undef */
const assert = require('assert');
const { carveMathString, MathFunction } = require('../parser/carving/parser.carving.math');


describe('carveMathString Tests', () => {
	it('Empty string gives empty response', () => {
		const result = carveMathString('');
		assert.equal(result, '');
	});

	it('String without operators returns same string', () => {
		const result = carveMathString('abc123');
		assert.equal(result, 'abc123');
	});

	it('String with only "+" returns math object dividing empty strings', () => {
		const result = carveMathString('+');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "-" returns math object dividing empty strings', () => {
		const result = carveMathString('-', true);
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '-');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "*" returns math object dividing empty strings', () => {
		const result = carveMathString('*');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "/" returns math object dividing empty strings', () => {
		const result = carveMathString('/');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '/');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "%" returns math object dividing empty strings', () => {
		const result = carveMathString('%');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '%');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with only "^" returns math object dividing empty strings', () => {
		const result = carveMathString('^');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '^');
		assert.equal(result.left, '');
		assert.equal(result.right, '');
	});

	it('String with one "+" returns strings on either side', () => {
		const result = carveMathString('123abc+123abc');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.left, '123abc');
		assert.equal(result.right, '123abc');
	});


	it('String with multiple "+" returns chain of math functions', () => {
		const result = carveMathString('a+b+c');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.right, 'c');
		assert.equal(result.left instanceof MathFunction, true);
		assert.equal(result.left.symbol, '+');
		assert.equal(result.left.left, 'a');
		assert.equal(result.left.right, 'b');
	});

	it('String with multiple "^" returns chain folded in opposite direction', () => {
		const result = carveMathString('a^b^c');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '^');
		assert.equal(result.left, 'a');
		assert.equal(result.right instanceof MathFunction, true);
		assert.equal(result.right.symbol, '^');
		assert.equal(result.right.left, 'b');
		assert.equal(result.right.right, 'c');
	});

	it('Layered operators parse in correct order', () => {
		const result = carveMathString('5^6*3+2');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '+');
		assert.equal(result.right, '2');
		assert.equal(result.left instanceof MathFunction, true);
		assert.equal(result.left.symbol, '*');
		assert.equal(result.left.right, '3');
		assert.equal(result.left.left instanceof MathFunction, true);
		assert.equal(result.left.left.symbol, '^');
		assert.equal(result.left.left.right, '6');
		assert.equal(result.left.left.left, '5');
	});

	it('Simple negative number', () => {
		const result = carveMathString('-4');
		assert.equal(result, '-4');
	});

	it('Multiply negative number', () => {
		const result = carveMathString('-4*5');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.left, '-4');
		assert.equal(result.right, '5');
	});

	it('Multiply by negative number', () => {
		const result = carveMathString('5*-4');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.left, '5');
		assert.equal(result.right, '-4');
	});

	it('Negative number minus negative number', () => {
		const result = carveMathString('-5--4');
		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '-');
		assert.equal(result.left, '-5');
		assert.equal(result.right, '-4');
	});
});
