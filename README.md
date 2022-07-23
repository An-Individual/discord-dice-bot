# Discord Dice Bot

_**Current State: Minimum Viable Product. If you encounter a bug please file an issue containing the input that caused it and the message it generated.**_

If you're here to read code, I must apologize in advance. This project is the jet lagged fever dream of someone only semi-familiar with Javascript more or less making it up as they go. Read at your peril.

If, however, you're just looking for a Discord bot that can roll some dice. Welcome! Dice Bot here is a chat bot that adds slash commands to your server that more or less mimic Roll20's dice rolling syntax. It runs on [Node.js](https://nodejs.org) using [Discord.js](https://discord.js.org). There's a public version of the bot you can authorize by [clicking here](https://discord.com/api/oauth2/authorize?client_id=1000222866173866004&permissions=0&scope=bot). However, it's just running on free tier Heroku, so if you want to use it long term I recommend running a version of it yourself. Fortunately, with some modest technical knowledge that isn't too hard. So if you plan on using it consider standing up your own version. It's a fairly powerful dice engine so you can do things like `/r input:(3+{2d6!<2-1,5d8r3r5>3,1d6^3}dl2)*2d6`.

![/gr input:(3+{2d6!<2-1,5d8r3r5>3,1d6^3}dl2)*2d6
Result: 16
(3 + (([1] ^ 3) + (([2] + [2] + [4] + [4] + [6])) + (([1] + [2] + [1] + [2]) - 1))) * ([1] + [1])](https://github.com/An-Individual/images/blob/main/dicebotexample.JPG?raw=true "Dice Bot Example")

## Syntax

Dice Bot adds the following slash commands to a server.

* `/r` and `/roll` take a dice string and prints the result in a public message everyone on the channel can see.
* `/gr` and `/gmroll` take a dice string and respond with an ephemeral message only you can see.

All of these commands require an `input:` option that contains the dice string (eg. `/r input:1d20`). In most cases Discord's interface will add this automatically since it's a required part of the command.

If you're familiar with [Roll20 syntax](https://wiki.roll20.net/Dice_Reference) the main differences you'll want to watch for are that `d` and `k` are not equivalent to `dl` and `kh`. They are their own modifiers used to drop or keep specific dice numbers. `[` and `]` brackets in the rolls are not recognized and will cause errors. Exponents are denoted with `^` instead of `**`. `{3d20+3}>21` will simply total `3d20+3` and tell you if the result is greater than `21`. `{2d6+2d8}>4` will behave how you expect, but there isn't any special handling in the `{3d20+3}` case to keep summing of the dice with an integer from returning a single number instead of a set of dice. The `cs` modifier isn't supported. And finally, you cannot compute dice so things like `(1+2)d6` or `3d(4+6)` will fail.

Dice Bot also lets you mix in more modifiers and executes them from left to right instead of in a predefined order, which might produce odd results (eg. dropping dice and then exploding them will produce different results from exploding dice and then dropping them).

If you aren't familiar with Roll20 syntax, here's a rough primer. A dice string is effectively just a math string with dice mixed into it. These dice rolls can have modifiers tagged onto them triggering features like explosions and rerolls, as well as aggregators that produce numbers by counting or matching the dice instead of just summing them. The supported math characters are as follows.

* `+` and `-` are addition and subtraction. So `3+2` equals 5.
* `*` is used for multiplication. So `3*2` equals 6.
* `/` is used for division. So `3/2` equals 1.5.
* `%` is modulo, which returns the remainder of dividing the left side with the right side. So `25%10` equals 5.
* `^` is an exponent. So `3^2` is 3<sup>2</sup> which equals 9.

These math functions are not always resolved in the order they are written. Exponents are resolved first. Then multiplication, division, and modulo. Then addition and subtraction. So `2+3*4^5` is actually executed like this `2+(3*(4^5))`. You can override this order by adding brackets. So if you wanted to resolve the previous string in the order it was written you would write `((2+3)*4)^5`.

Dice Bot also supports the following basic math functions.

* `floor(x)` rounds `x` down. So `floor(2.9)` returns 2.
* `ceil(x)` rounds `x` up. So `ceil(2.1)` returns 3.
* `round(x)` rounds `x` to the nearest whole number. So `round(2.5)` is 3 and `round(2.4)` returns 2.
* `abs(x)` returns the absolute value of `x`. So `abs(-3)` returns 3.

Anywhere in the math a number could appear can be replaced with a dice string or a grouping/list. Dice strings themselves use the following format where X is the number of sides the dice have. You can also repace X with 'f' instead of a number to roll Fudge dice.

`[# dice]dX[modifiers][aggregator]`

The number of dice is optional so `d20` and `1d20` mean the same thing. Modifiers and aggregators are also optional. A basic roll command might look like this.

`/r input:3d6`

This will roll 3 six sided dice and total their values. So if the dice roll 3, 1, and 5 the result will be 9. If we instead used.


`/r input:3d6+2`

This will do the same thing as the previous roll, but add 2 to the result for a total of 11.

### Roll Modifiers

If you need to do more with dice than just roll them there are some modifiers you can add to the dice string. Many of these include something called a compare point, which will be covered below. Here are the modifiers.

* `!` causes the dice pool to explode. Which means that all dice rolled at their maximum value cause an additional dice to be rolled and added to the pool. If those dice also roll the maximum value this causes more dice to be rolled and the cycle repeats. `!` can include a compare point so `4d6!5` means all 5s will explode while `4d6!>4` means all results greater than 4 will explode.

* `!!` causes a compounding explosion. This functions the same as a regular explosion except that the exploding values are added to the values of the dice that rolled the explosion rather than to the pool as a whole. So if `4d6!` rolled 3, 2, 6, 5 you'd roll another die and add it to the list. But in the `4d6!!` case the value of the extra die roll would be added to the 6. Compounding explosions also support compare points.

* `!p` causes a penetrating explosion, which is like a regular explosion except every extra die rolled has a -1 modifier applied to it. Some specific games require this feature. As with other explosions, compare points are supported.

* `r` causes dice to be rerolled. It must be followed by a compare point which defines which dice are rerolled. So `r4` rerolls all 4s and `r<3` rerolls all numbers less than 3. You can chain `r` modifiers to create more complex reroll conditions. For example, `r3r5` rerolls all 3s and 5s. If the rerolled numbers still match the reroll conditions they are rolled again. In results, rerolls appear as discarded dice with new dice added so you can see how many rerolls occurred.

* `ro` is the same as `r` except that dice are only rerolled once even if the second roll matches the reroll condition. While you can mix `r` and `ro` modifiers, they won't chain together the same way that they do when like modifiers are chained. For example `4d6r4r5` cannot have 4s or 5s in its results because it will reroll both of them until none are present. But `4d5r4ro5` can have both 4s and 5s in the result because it will reroll all 4s until there are none, but then reroll any 5s once which could result in more 4s or 5s being rolled.

* `k` and `d` will keep or drop all dice that don't match an included compare point. So `4d6k>4` will discard all dice that are less than or equal to 4 and `4d6d3` will drop all 3s. Like with rerolls, like modifiers can be chained together so `4d6k1k3k5` will keep all 1s, 3s, and 5s.

* `kh` (keep high), `kl` (keep low), `dh` (drop high), and `dl` (drop low) can be used to keep or drop the highest or lowest die in a set. So `4d6kh` will discard all but the highest die and `4d6dl` will discard the lowest die. You can include a number after these modifiers to keep or drop a specific number of dice. So `4d6kl2` will discard all but the two lowest dice.

A bunch of these modifiers mention compare points which can be one of 3 things.

* An integer on it's own or `=` followed by an integer will match any die whose value matches the given integer. So `r4` or `r=4` will both reroll all 4s.

* `>` followed by an integer will match all dice whose value is greater than the given integer. So `!>4` will explode all dice greater than 4.

* `<` followed by an integer will match all dice whose value is less than the given integer. So `d<4` will drop all dice less than 4.

The modifier part of the dice roll can include any number of these modifiers. `4d6!r4r<2kh3!pro6!!` is a valid string if you can find a use for it. Order matters here and these modifiers are applied from left to right. While the bot won't stop you, expect to get odd results when you use an explode modifier more than once. Should be fine for basic explosions, but they weren't designed for reuse and especially not mixed explosion types.

### Aggregators

By default, any pool of dice, after modifiers are applied, will have all the dice values summed up to produce a result. You can change that behavior by applying one, and only one, aggregator. There are two supported aggregators. A success/fail aggregator and a match counting aggregator.

* If the dice string ends with a compare point, a success aggregation is performed where every die whose value matches the compare point counts as a success. So if `4d6>3` rolls 1, 4, 5, and 2 the result is 2. You can add an `f` and a second compare point to count failures that deduct from the count. So if `4d6>4f<3` rolls 5, 2, 6, 3 the result is 1. If the number of failures are greater than the number of successes the result will be a negative number.

* If you just want to make matches easier to spot you can add an `m` to your roll. This won't change how the result is calculated, but it will sort the result string so that larger numbers of matches and higher matching numbers appear together and closer to the left. So `8d6m` might give you 1, 1, 1, 5, 5, 3, 2, 4 as results instead of scattering them so you have to find them yourself. If you instead use `mt` the result of the roll will be the number of matches found in addition to the sorting. So if `8d6mt` gave the same rolls it did in the previous example the result would be 2 for the 2 matches instead of 22 which is the sum of the dice.

### Grouping / Lists

Groups / lists denote two different ways of using curly brackets that you can use to a apply a few specific modifiers or aggregators in situations you couldn't otherwise.

Lists are very simple. They're a sequence of equations, which can include dice rolls, wrapped in curly brackets and separated by commas. `{2d6+3,8d4!,(3+2)^4}` would be a valid list. By default, each entry in the list is resolved to its respective number and will simply be summed together. But you can apply some modifiers as we'll discuss shortly.

Dice groups are a special kind of list used to combine different types of dice into a single roll. They are made by putting a series of dice rolls inside curly brackets and linking them with `+` signs. The rolls themselves can include modifiers but you can't include any other math functions or plain numbers. For example, `{2d6!+3d10r3r5}` is a valid dice group, but `{2d6+2d8+3}` will be treated as a single entry list. When taking actions on a dice group each die is treated as its own entry in a list rather than the whole roll being 1 entry.

Regardless of whether you're grouping dice or making a list, here are the actions you can take on them. Keep in mind that only 1 of these modifiers can be applied. You can't chain them together like you can with dice strings.

* `k`, `d`, `kh`, `kl`, `dh`, and `dl` can all be applied. These keep or drop numbers from the list just as they do with dice. So `{2d6+2d8}kh3` would discard all but the 3 highest dice among the rolled d6s and d8s while `{2d6,2d8}dl` would roll and sum the d6s and d8s individually and drop the lowest of the two results.

* You can also follow a list/group with a compare point to apply a success/failure aggregator to them. So `{2d6+2d8}>4f1` would roll both the d6s an d8s and count any that are greater than 4 as successes and any that roll a 1 as a failure while `{2d6,2d8}>4` would roll and sum the d6s and d8s individually and count 1 for each of the two results that are greater than 4.

## Running the Bot

**Disclaimer:** I'm going to write this assuming some baseline technical knowledge. If you aren't familiar with Git or Node.js I recommend looking up some beginner tutorials first. I'm not a native Node.js developer and thus a poor person to teach such things.

The broad steps for running the bot, once you have a copy of the code base, are as follows. Commands must be run from the directory containing the bot's files.

1) [Create a bot](https://discordjs.guide/preparations/setting-up-a-bot-application.html) and [add it to your server](https://discordjs.guide/preparations/adding-your-bot-to-servers.html). During this step make sure to record your bot's token (generated by clicking "Reset Token" on the Bot page) and Application ID (on the General Information page). IMPORTANT: Keep your bot's token secret. If it is ever compromised generate a new one ASAP.

2) Install [Node.js](https://nodejs.org) version 16.16.0 or newer. Only 16.9.0 should be required but 16.16.0 is the one I've tested.

3) Install the bot's dependencies using `npm install`. this will install [Discord.js](https://discord.js.org), [ESLint](https://eslint.org/), and [Sinon.js](https://sinonjs.org/). If you want to run the tests you'll need to install [Mocha](https://mochajs.org/) yourself.

4) Create a copy of the `config-template.json` file named `config.json` and replace `<application-token>` with your application's token and `<application-id>` with your application's ID.

5) Register the bot's commands using `npm run deploy-commands`. You only need to run this once to register the bot's commands with Discord. After that, you can start and stop the bot without repeating this step.

6) Run the bot itself using `npm run start`. The bot will print "Ready!" in the command prompt at which point, if all has gone well, it will appear online in Discord and will respond to commands.

If you installed Mocha in step 3 you can run the tests using `npm run test`.

Once you have the bot running you can keep it on your own machine, starting and stopping it as needed, or deploy it to a service like Heroku. Unfortunately, if I am a poor person to learn Node.js from I'm an even worse person to learn Heroku from. I've included the `Procfile` I used to deploy it, but recommend seeking out other sources for how to use it. The important bit is that it needs to run as a worker, not a web application, or it will crash shortly after startup. Depending on how you deploy it you may also need to remove the `.gitignore` file as this filters out important files like the `config.json` file.