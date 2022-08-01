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

// Handle slash commands
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand() ||
		(interaction.commandName !== 'r' &&
			interaction.commandName !== 'roll' &&
			interaction.commandName !== 'gr' &&
			interaction.commandName !== 'gmroll')) return;

	const gmRoll = interaction.commandName.startsWith('g');

	let input = interaction.options.getString('input');
	const result = processStringAndCreateResponse(input);

	input = standardizeDiceString(input);

	let response = `> \`/${interaction.commandName} input:${input}\`\n${result}`;
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

// Login to Discord with your client's token
client.login(token);