const { CharacterSets } = require('../parser.constants.js');

class MathFunction {
	constructor(symbol, left, right) {
		this.symbol = symbol;
		this.left = left;
		this.right = right;
	}
}

function carveMathString(text, beforeBracket) {
	return carveMathByCharacters(text, '+-', carveMathMultDivMod, (idx) => {
		if (text[idx] !== '-') {
			return false;
		}

		if (idx === 0) {
			// If we're aren't before a bracket ignore it, otherwise this
			// is an operator on the contents of the bracket.
			// We only want to do this during the first split, any sub splits
			// will occur immediately after math characters at index 0.
			if (beforeBracket) {
				return false;
			}
			return true;
		}

		return CharacterSets.MathOperators.indexOf(text[idx - 1]) >= 0;
	});
}

function carveMathMultDivMod(text) {
	return carveMathByCharacters(text, '*/%', carveMathExponentiation);
}

function carveMathExponentiation(text) {
	if (!text) {
		return text;
	}

	const idx = text.indexOf('^');
	if (idx < 0) {
		return text;
	}

	const leftSide = idx === 0 ? '' : text.substring(0, idx);
	const rightSide = idx + 1 >= text.length ? '' : text.substr(idx + 1);

	return new MathFunction('^', leftSide, carveMathExponentiation(rightSide));
}

function carveMathByCharacters(text, splitterCharacters, subSplitFunc, ignoreFunc) {
	const dividedTxt = splitStringOnCharacters(text, splitterCharacters, ignoreFunc);

	if (dividedTxt.length === 0) {
		return text;
	}

	let startIdx = 0;
	let result = '';
	if (splitterCharacters.indexOf(dividedTxt[0]) < 0) {
		startIdx = 1;
		result = !subSplitFunc ? dividedTxt[0] : subSplitFunc(dividedTxt[0]);
	}

	for (let i = startIdx; i < dividedTxt.length; i++) {
		if (splitterCharacters.indexOf(dividedTxt[i]) < 0) {
			throw new Error('Math syntax error.');
		}

		const operator = dividedTxt[i];
		let rightSide = '';
		i++;
		if (i < dividedTxt.length) {
			rightSide = !subSplitFunc ? dividedTxt[i] : subSplitFunc(dividedTxt[i]);
		}

		result = new MathFunction(operator, result, rightSide);
	}

	return result;
}

function splitStringOnCharacters(text, splitterCharacters, ignoreFunc) {
	const result = [];

	let startIdx = 0;
	for (let i = 0; i < text.length; i++) {
		if (splitterCharacters.indexOf(text[i]) >= 0 && (!ignoreFunc || !ignoreFunc(i))) {
			const leftSide = text.substring(startIdx, i);
			if (leftSide) {
				result.push(leftSide);
			}

			result.push(text[i]);
			startIdx = i + 1;
		}
	}

	if (startIdx < text.length) {
		result.push(text.substr(startIdx));
	}

	return result;
}

module.exports = {
	carveMathString,
	MathFunction,
};