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
	new SlashCommandBuilder().setName('d4').setDescription('Rolls a 4 sided die.'),
	new SlashCommandBuilder().setName('d6').setDescription('Rolls a 6 sided die.'),
	new SlashCommandBuilder().setName('2d6').setDescription('Rolls two 6 sided dice.'),
	new SlashCommandBuilder().setName('d8').setDescription('Rolls an 8 sided die.'),
	new SlashCommandBuilder().setName('d10').setDescription('Rolls a 10 sided die.'),
	new SlashCommandBuilder().setName('d12').setDescription('Rolls a 12 sided die.'),
	new SlashCommandBuilder().setName('d20').setDescription('Rolls a 20 sided die.'),
	new SlashCommandBuilder().setName('d20a').setDescription('Rolls two 20 sided dice and takes the highest.'),
	new SlashCommandBuilder().setName('d20advantage').setDescription('Rolls two 20 sided dice and takes the highest.'),
	new SlashCommandBuilder().setName('d20d').setDescription('Rolls two 20 sided dice and takes the lowest.'),
	new SlashCommandBuilder().setName('d20disadvantage').setDescription('Rolls two 20 sided dice and takes the lowest.'),
	new SlashCommandBuilder().setName('d100').setDescription('Rolls two 20 sided dice and takes the lowest.'),
	new SlashCommandBuilder().setName('d1000').setDescription('Rolls two 20 sided dice and takes the lowest.'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);