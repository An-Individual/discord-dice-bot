const KeepDropType = {
	SPECIFIC: 1,
	HIGH: 2,
	LOW: 3,
};

const FunctionNames = {
	FLOOR: 'floor',
	ROUND: 'round',
	CEIL: 'ceil',
	ABS: 'abs',
};

const FunctionList = [FunctionNames.FLOOR, FunctionNames.ROUND, FunctionNames.CEIL, FunctionNames.ABS];

const CharacterSets = {
	Letters: 'abcdefghijklmnopqrstuvwxyz',
	Numbers: '0123456789',
	ComparePointOperators: '=<>',
	SetModifierCharacters: 'abcdefghijklmnopqrstuvwxyz0123456789=<>-',
	MathOperators: '+-*/%^<>=',
};

module.exports = {
	KeepDropType,
	FunctionNames,
	FunctionList,
	CharacterSets,
};