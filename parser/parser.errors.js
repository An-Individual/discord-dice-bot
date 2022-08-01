function throwIfDone(done) {
	if (done) {
		throw new Error('Unexpected end of dice string');
	}
}

function throwIfNotDone(iteratorLocation) {
	if (!iteratorLocation.done) {
		throw new Error(`Unexpected character "${iteratorLocation.value}"`);
	}
}

function throwUnexpectedChar(char) {
	throw new Error(`Encountered unexpected character '${char}'`);
}

module.exports = {
	throwIfDone,
	throwIfNotDone,
	throwUnexpectedChar,
};