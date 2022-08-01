const KeepDropType = {
	SPECIFIC: 1,
	HIGH: 2,
	LOW: 3,
};

const ParserResolveTypes = {
	DICE_ROLL: 1,
	NUMBER: 2,
	NUMBER_LIST: 3,
};

const ResolvedNumberType = {
	UNTYPED: 0,
	SUCCESS_FAIL: 1,
	MATCH_COUNT: 2,
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
	ParserResolveTypes,
	ResolvedNumberType,
	FunctionNames,
	FunctionList,
	CharacterSets,
};