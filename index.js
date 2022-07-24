// Require the necessary discord.js classes
const { Client } = require('discord.js');
const { token, maxDicePerRoll, maxMessageLength } = require('./config.json');
const parser = require('./parser');
const parserObjects = require('./parser-objects');

const client = new Client({ intents: [] });

/*
// Uncomment this code and remove the client creation step above to enable the bot to
// respond to direct messages.

const { Intents } = require('discord.js');

// Create a new client instance
const client = new Client({ partials: ['CHANNEL'], intents: [Intents.FLAGS.DIRECT_MESSAGES] });

client.on('messageCreate', async message => {
	// Only handle direct messages by non-bots.
	if (message.author.bot ||
		message.guildId) {
		return;
	}

	const input = TrimCommand(message.content);
	let response = processStringAndCreateResponse(input);
	response = enforceMessageLengthLimit(response);

	await message.reply(response);
});

function TrimCommand(input) {
	if (!input || !input.startsWith('/')) {
		return input;
	}

	let idx = input.indexOf(':');
	if (idx >= 0) {
		return input.substr(idx + 1);
	}

	idx = input.indexOf(' ');
	if (idx >= 0) {
		return input.substr(idx + 1);
	}

	return input;
}
*/

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

	input = parser.standardizeDiceString(input);

	let response = `> \`/${interaction.commandName} input:${input}\`\n${result}`;
	response = enforceMessageLengthLimit(response);

	await interaction.reply({ content: response, ephemeral: gmRoll });
});

function enforceMessageLengthLimit(response) {
	if (response && response.length > maxMessageLength) {
		return response.substr(0, maxMessageLength - 3) + '...';
	}

	return response;
}

function processStringAndCreateResponse(input) {
	try {
		const tracker = new DiceCountTracker();
		const result = parser.ResolveDiceString(input, tracker);
		let typeString;
		switch (result.type) {
			case parserObjects.ResolvedNumberType.MATCH_COUNT:
				typeString = ' Matches';
				break;
			case parserObjects.ResolvedNumberType.SUCCESS_FAIL:
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

class DiceCountTracker {
	constructor() {
		this.count = 0;
	}

	notifyNewDice(num) {
		this.count += num;
		if (this.count > maxDicePerRoll) {
			throw new Error(`Exceeded the maximum of ${maxDicePerRoll} dice.`);
		}
	}
}

// Login to Discord with your client's token
client.login(token);