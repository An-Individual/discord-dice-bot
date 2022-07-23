const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, token } = require('./config.json');

const rollDescription = 'Rolls dice. For syntax see: https://github.com/An-Individual/discord-dice-bot';
const gmRollDescription = 'Rolls dice privately. For syntax see: https://github.com/An-Individual/discord-dice-bot';
const commandOption = option => option.setName('input')
	.setDescription('The dice string. For syntax see: https://github.com/An-Individual/discord-dice-bot')
	.setRequired(true);

const commands = [
	new SlashCommandBuilder().setName('r').setDescription(rollDescription).addStringOption(commandOption),
	new SlashCommandBuilder().setName('roll').setDescription(rollDescription).addStringOption(commandOption),
	new SlashCommandBuilder().setName('gr').setDescription(gmRollDescription).addStringOption(commandOption),
	new SlashCommandBuilder().setName('gmroll').setDescription(gmRollDescription).addStringOption(commandOption),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);