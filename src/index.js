import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, Events } from "discord.js";
import { commandList, commandMap } from "./commands/index.js";
import { handleColorButton } from "./interactions/colorButtons.js";
import { startupCleanup } from './utils/startupCleanup.js';
import { closeDatabase } from './database/colors.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        console.log("Registering commands...");
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandList.map(cmd => cmd.data) }
        );
        console.log("✅ Commands registered!");
    } catch (err) {
        console.error(err);
    }
})();

client.once(Events.ClientReady, async (client) => {
    console.log(`🤖 Logged in as ${client.user.tag}`);

    await startupCleanup(client);
});

client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand()) {
        const cmd = commandMap[interaction.commandName];
        if (!cmd) return;

        try {
            await cmd.execute(interaction);
        } catch (err) {
            console.error(err);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ An unexpected error occurred.",
                    flags: 64
                });
            }
        }

        return; // optional, but clean
    }

    if (interaction.isButton() && interaction.customId.startsWith("color_")) {
        try {
            await handleColorButton(interaction);
        } catch (err) {
            console.error(err);
        }
    }
});

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

    try {
        await client.destroy(); // disconnect from Discord
    } catch {}

    try {
        closeDatabase(); // close SQLite
    } catch (err) {
        console.error("Error closing DB:", err);
    }

    process.exit(0);
}

// Handle common shutdown signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGQUIT", shutdown);

client.login(process.env.BOT_TOKEN);