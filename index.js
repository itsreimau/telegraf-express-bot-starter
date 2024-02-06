import express from "express";
import {
    Telegraf
} from "telegraf";
import {
    exec
} from 'child_process';
import {
    inspect
} from 'util';

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Initialize the Express application
const app = express();
const port = Number(process.env.PORT) || 3000;

// Assert and refuse to start bot if token or webhookDomain is not passed
if (!process.env.BOT_TOKEN) throw new Error('"BOT_TOKEN" env var is required!');
if (!process.env.WEBHOOK_DOMAIN) throw new Error('"WEBHOOK_DOMAIN" env var is required!');

// Use middleware to parse incoming JSON requests
app.use(express.json());

// Set the bot API endpoint
app.use(
    await bot.createWebhook({
        domain: process.env.WEBHOOK_DOMAIN,
    })
);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
});

// Handle messages
bot.start((ctx) => ctx.reply('Active!'))

// Handle eval code starting with '> ' or 'x '
bot.command(['>', 'x'], async (ctx) => {
    try {
        // Check if the message has content and is sent by the owner
        if (!ctx.message.text || ctx.message.from.username.toString().includes(process.env.OWNER)) return;

        const code = ctx.message.text.slice(ctx.message.entities[0].length + 1);

        await ctx.reply('Processing...');
        const result = await eval(ctx.message.text.startsWith('x') ? `(async () => { ${code} })()` : code);
        await ctx.reply(inspect(result));
        return await ctx.reply('Success!');
    } catch (error) {
        console.error("Error:", error);
        await ctx.reply(`[ ! ] Error occurred: ${error.message}`);
    }
});

// Handle shell command starting with '$ '
bot.command('$', async (ctx) => {
    try {
        // Check if the message has content and is sent by the owner
        if (!ctx.message.text || ctx.message.from.username.toString().includes(process.env.OWNER_USERNAME)) return;

        const command = ctx.message.text.slice(ctx.message.entities[0].length + 1);

        await ctx.reply('Processing...');
        const output = await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Error: ${error.message}`));
                } else if (stderr) {
                    reject(new Error(stderr));
                } else {
                    resolve(stdout);
                }
            });
        });

        await ctx.reply(output);
        return await ctx.reply('Success!');
    } catch (error) {
        console.error("Error:", error);
        await ctx.reply(`[ ! ] Error occurred: ${error.message}`);
    }
});

// Runs an Express server on a specified port
app.listen(port, () => console.log('Listening on port', port));
