const { MathFunction } = require('./parser.carving.math');

/**
 * Takes an array of bracket objects, strings, and math functions
 * and causes math functions to use their empty slots from the
 * earlier carving and folding step to consume their neighbors.
 * If all is going correctly, this will return a single entry
 * list that is either a string, Bracket, or MathFunction.
 * @param {*} elements An array of bracket objects, strings, and
 * math functions.
 * @returns A new array after the the math functions have consumed
 * their neighbors.
 */
function foldAdjacentObjectsIntoMathFuncs(elements) {
	const result = [];

	for (let i = 0; i < elements.length; i++) {
		if (i === 0) {
			result.push(elements[i]);
			continue;
		}

		let mathInvolved = false;
		let emptyRight;
		if (result[result.length - 1] instanceof MathFunction) {
			mathInvolved = true;
			emptyRight = getMathFuncWithEmptyRightSlot(result[result.length - 1]);
		}

		let emptyLeft;
		if (elements[i] instanceof MathFunction) {
			mathInvolved = true;
			emptyLeft = getMathFuncWithEmptyLeftSlot(elements[i]);
		}

		if (mathInvolved) {
			if (emptyRight && !emptyLeft) {
				emptyRight.right = elements[i];
			}
			else if (!emptyRight && emptyLeft) {
				emptyLeft.left = result.pop();
				result.push(elements[i]);
			}
			else {
				// Either we have 2 math functions both looking to consume
				// their neighbor or 2 unlinked math functions, both of which
				// imply a syntax issue of some kind.
				throw new Error('Math syntax error');
			}
		}
		else {
			result.push(elements[i]);
		}
	}

	return result;
}

/**
 * Helper method for foldAdjacentObjectsIntoMathFuncs().
 * Finds the left most MathFunction in the given MathFunction
 * hierarchy that has an empty left slot.
 * @param {MathFunction} func The root of the function hierarchy to search.
 * @returns A MathFunction with an empty left slot or undefined.
 */
function getMathFuncWithEmptyLeftSlot(func) {
	if (func instanceof MathFunction && !func.left) {
		return func;
	}

	if (func.left instanceof MathFunction) {
		const leftCheck = getMathFuncWithEmptyLeftSlot(func.left);
		if (leftCheck) {
			return leftCheck;
		}
	}

	if (func.right instanceof MathFunction) {
		const rightCheck = getMathFuncWithEmptyLeftSlot(func.right);
		if (rightCheck) {
			return rightCheck;
		}
	}

	return;
}

/**
 * Helper method for foldAdjacentObjectsIntoMathFuncs().
 * Finds the right most MathFunction in the given MathFunction
 * hierarchy that has an empty right slot.
 * @param {MathFunction} func The root of the function hierarchy to search.
 * @returns A MathFunction with an empty right slot or undefined.
 */
function getMathFuncWithEmptyRightSlot(func) {
	if (!func.right) {
		return func;
	}

	if (func.right instanceof MathFunction) {
		const rightCheck = getMathFuncWithEmptyRightSlot(func.right);
		if (rightCheck) {
			return rightCheck;
		}
	}

	if (func.left instanceof MathFunction) {
		const leftCheck = getMathFuncWithEmptyRightSlot(func.left);
		if (leftCheck) {
			return leftCheck;
		}
	}

	return;
}

module.exports = {
	foldAdjacentObjectsIntoMathFuncs,
};