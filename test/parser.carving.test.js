/* eslint-disable no-undef */
const assert = require('assert');
const { carveDiceString, Brackets } = require('../parser/carving/parser.carving');
const { MathFunction } = require('../parser/carving/parser.carving.math');


describe('carveDiceString Tests', () => {
	it('Empty string produces empty bracket object', () => {
		const result = carveDiceString('');

		assert.equal(!result, true);
	});

	it('Single open bracket causes error', () => {
		assert.throws(() => {
			carveDiceString('(');
		});
	});

	it('Single close bracket causes error', () => {
		assert.throws(() => {
			carveDiceString(')');
		});
	});

	it('Simple bracket pair produces empty bracket inside bracket', () => {
		const result = carveDiceString('()');

		assert.equal(result instanceof Brackets, true);
		assert.equal(result.elements.length, 0);
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(!result.isList, true);
		assert.equal(result.terminatingChar, ')');
	});

	it('Simple empty list', () => {
		const result = carveDiceString('{}');

		assert.equal(result instanceof Brackets, true);
		assert.equal(result.elements.length, 0);
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(result.isList, true);
		assert.equal(!result.terminatingChar, true);
	});

	it('Simple list with 2 empty entries does not get entries', () => {
		const result = carveDiceString('{,}');

		assert.equal(result instanceof Brackets, true);
		assert.equal(result.elements.length, 0);
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(result.isList, true);
		assert.equal(!result.terminatingChar, true);
	});

	it('Simple list with 2 entries', () => {
		const result = carveDiceString('{a,b}');

		assert.equal(result instanceof Brackets, true);
		assert.equal(result.elements.length, 2);
		assert.equal(result.elements[0].elements[0], 'a');
		assert.equal(result.elements[1].elements[0], 'b');
		assert.equal(!result.functionName, true);
		assert.equal(result.modifierSuffix, '');
		assert.equal(result.isList, true);
		assert.equal(!result.terminatingChar, true);
	});

	it('Basic math parsed', () => {
		const result = carveDiceString('a+b');

		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.left, 'a');
		assert.equal(result.right, 'b');
	});

	it('Following brackets break math parsing order', () => {
		const result = carveDiceString('a^(b+c)');

		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '^');
		assert.equal(result.left, 'a');

		assert.equal(result.right instanceof Brackets, true);
		assert.equal(result.right.elements.length, 1);
		assert.equal(result.right.elements[0] instanceof MathFunction, true);
		assert.equal(result.right.elements[0].symbol, '+');
		assert.equal(result.right.elements[0].left, 'b');
		assert.equal(result.right.elements[0].right, 'c');
	});

	it('Leading brackets break math parsing order', () => {
		const result = carveDiceString('(a+b)*c');

		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '*');
		assert.equal(result.right, 'c');

		assert.equal(result.left instanceof Brackets, true);
		assert.equal(result.left.elements.length, 1);
		assert.equal(result.left.elements[0] instanceof MathFunction, true);
		assert.equal(result.left.elements[0].symbol, '+');
		assert.equal(result.left.elements[0].left, 'a');
		assert.equal(result.left.elements[0].right, 'b');
	});

	it('Single element list with mods', () => {
		const result = carveDiceString('{5d6}>-1');

		assert.equal(result instanceof Brackets, true);
		assert.equal(result.isList, true);
		assert.equal(result.modifierSuffix, '>-1');
		assert.equal(result.elements.length, 1);

		assert.equal(result.elements[0] instanceof Brackets, true);
		assert.equal(result.elements[0].elements[0], '5d6');
	});

	it('Multi element list with mods', () => {
		const result = carveDiceString('{2d8,1d10,2d6}>7');

		assert.equal(result instanceof Brackets, true);
		assert.equal(result.isList, true);
		assert.equal(result.modifierSuffix, '>7');
		assert.equal(result.elements.length, 3);

		assert.equal(result.elements[0] instanceof Brackets, true);
		assert.equal(result.elements[0].elements[0], '2d8');
		assert.equal(result.elements[1] instanceof Brackets, true);
		assert.equal(result.elements[1].elements[0], '1d10');
		assert.equal(result.elements[2] instanceof Brackets, true);
		assert.equal(result.elements[2].elements[0], '2d6');
	});

	it('Single element list with mods followed by minus', () => {
		const result = carveDiceString('{5d6}>3-1');

		assert.equal(result instanceof MathFunction, true);
		assert.equal(result.symbol, '-');
		assert.equal(result.right, '1');

		assert.equal(result.left instanceof Brackets, true);
		assert.equal(result.left.isList, true);
		assert.equal(result.left.modifierSuffix, '>3');
		assert.equal(result.left.elements.length, 1);

		assert.equal(result.left.elements[0] instanceof Brackets, true);
		assert.equal(result.left.elements[0].elements[0], '5d6');
	});

	it('Simple floor method', () => {
		const result = carveDiceString('floor(-5.5)');

		assert.equal(result instanceof Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'floor');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Simple round method', () => {
		const result = carveDiceString('round(-5.5)');

		assert.equal(result instanceof Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'round');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Simple ceil method', () => {
		const result = carveDiceString('ceil(-5.5)');

		assert.equal(result instanceof Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'ceil');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Simple abs method', () => {
		const result = carveDiceString('abs(-5.5)');

		assert.equal(result instanceof Brackets, true);
		assert.equal(!result.isList, true);
		assert.equal(result.functionName, 'abs');
		assert.equal(!result.modifierSuffix, true);
		assert.equal(result.elements.length, 1);
		assert.equal(result.elements[0], '-5.5');
	});

	it('Function using list brackets throws error', () => {
		assert.throws(() => {
			carveDiceString('floor{-5.5}');
		});
	});
});