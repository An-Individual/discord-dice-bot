// Require the necessary discord.js classes
const { Client } = require('discord.js');
const { token, maxDicePerRoll, maxMessageLength } = require('./config.json');
const { ResolvedNumberType } = require('./parser/parser.constants');
const { resolveDiceString, standardizeDiceString, BaseDieCountTracker, BaseFormatter } = require('./parser/parser');

const client = new Client({ intents: [] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

// Handle errors
client.on('error', console.error);

const quickCommands = {
	'd4': 'd4',
	'd6': 'd6',
	'2d6': '2d6',
	'd8': 'd8',
	'd10': 'd10',
	'd12': 'd12',
	'd20': 'd20',
	'd20a': '2d20kh',
	'd20advantage': '2d20kh',
	'd20d': '2d20kl',
	'd20disadvantage': '2d20kl',
	'd100': 'd100',
	'd1000': 'd1000',
};

// Handle slash commands
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) {
		return;
	}

	if (interaction.commandName === 'gofirst') {
		handleGoFirstRoll(interaction);
		return;
	}

	if (!quickCommands[interaction.commandName] &&
		interaction.commandName !== 'r' &&
		interaction.commandName !== 'roll' &&
		interaction.commandName !== 'gr' &&
		interaction.commandName !== 'gmroll') return;

	const gmRoll = interaction.commandName.startsWith('g');

	let input = quickCommands[interaction.commandName];
	if (!input) {
		input = interaction.options.getString('input');
	}

	const result = processStringAndCreateResponse(input);

	input = standardizeDiceString(input);

	const publicCommand =
		interaction.commandName.startsWith('r') || interaction.commandName.startsWith('g') ?
			interaction.commandName :
			'r';

	let response = `> \`/${publicCommand} input:${input}\`\n${result}`;
	response = enforceMessageLengthLimit(response);

	await interaction.reply({ content: response, ephemeral: gmRoll });
});

/**
 * Given a Discord message string, ensures the string's
 * length doesn't exceed configured maximum length.
 * @param {string} response The full length response.
 * @returns A length limited response.
 */
function enforceMessageLengthLimit(response) {
	if (response && response.length > maxMessageLength) {
		return response.substr(0, maxMessageLength - 3) + '...';
	}

	return response;
}

/**
 * The bot's core work horse method. Takes a roll command
 * input string, executes it, and creates a response string
 * for displaying the results to the caller.
 * @param {string} input Roll command input string
 * @returns A response string for displaying the results to
 * the caller.
 */
function processStringAndCreateResponse(input) {
	try {
		const tracker = new DiceCountTracker();
		const formatter = new DiscordFormatter();
		const result = resolveDiceString(input, tracker, formatter);
		let typeString;
		switch (result.type) {
			case ResolvedNumberType.MATCH_COUNT:
				typeString = ' Matches';
				break;
			case ResolvedNumberType.SUCCESS_FAIL:
				if (result.value >= 0) {
					typeString = ' Successes';
				}
				else {
					typeString = ' Failures';
					result.value = Math.abs(result.value);
				}
				break;
			default:
				typeString = '';
				break;
		}

		return `**Result: ${result.value}${typeString}**\n>>> ${result.text}`;
	}
	catch (error) {
		return `Error: ${error.message}`;
	}
}

/**
 * The tracker used during processing to make sure the number of dice rolled
 * doesn't exceed the configured maximum.
 */
class DiceCountTracker extends BaseDieCountTracker {
	constructor() {
		super();
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
		if (this.count > maxDicePerRoll) {
			throw new Error(`Exceeded the maximum of ${maxDicePerRoll} dice.`);
		}
	}
}

/**
 * The formatter used to apply formatting to the response string during processing.
 */
class DiscordFormatter extends BaseFormatter {
	addDiscardedFormatting(text) {
		if (!text) {
			return text;
		}

		return `~~${text.replace(/~~/g, '')}~~`;
	}

	addExplodeFormatting(text, isDie) {
		if (!isDie || !text) {
			return text;
		}

		return `**${text}**`;
	}

	addSuccessFormatting(text, isDie) {
		if (!isDie || !text) {
			return text;
		}

		return `__${text}__`;
	}

	addFailureFormatting(text, isDie) {
		if (!isDie || !text) {
			return text;
		}

		return `*${text}*`;
	}
}

const goFirstD1 = [1, 8, 11, 14, 19, 22, 27, 30, 35, 38, 41, 48];
const goFirstD2 = [2, 7, 10, 15, 18, 23, 26, 31, 34, 39, 42, 47];
const goFirstD3 = [3, 6, 12, 13, 17, 24, 25, 32, 36, 37, 43, 46];
const goFirstD4 = [4, 5, 9, 16, 20, 21, 28, 29, 33, 40, 44, 45];

async function handleGoFirstRoll(interaction) {
	const p1Roll = goFirstD1[Math.floor(Math.random() * 12)];
	const p2Roll = goFirstD2[Math.floor(Math.random() * 12)];
	const p3Roll = goFirstD3[Math.floor(Math.random() * 12)];
	const p4Roll = goFirstD4[Math.floor(Math.random() * 12)];

	const lines = [`Player 1: [${p1Roll}]`, `Player 2: [${p2Roll}]`, `Player 3: [${p3Roll}]`, `Player 4: [${p4Roll}]`];

	const bestRoll = `[${Math.max(p1Roll, p2Roll, p3Roll, p4Roll)}]`;

	let result = '';
	for (let i = 0; i < lines.length; i++) {
		if (result) {
			result += '\n';
		}

		if (lines[i].endsWith(bestRoll)) {
			result += `**${lines[i]}**`;
		}
		else {
			result += lines[i];
		}
	}

	await interaction.reply({ content: result });
}

// Login to Discord with your client's token
client.login(token);