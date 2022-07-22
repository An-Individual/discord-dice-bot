// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token, maxDicePerRoll, maxMessageLength } = require('./config.json');
const parser = require('./parser');
const parserObjects = require('./parser-objects');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

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
	if (response.length > maxMessageLength) {
		response = response.substr(0, maxMessageLength - 3) + '...';
	}

	await interaction.reply({ content: response, ephemeral: gmRoll });
});

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