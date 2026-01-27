import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { commandList, commandMap } from "./commands/index.js";
import { handleColorButton } from "./interactions/colorButtons.js";

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

client.once("clientReady", () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
    if (interaction.isChatInputCommand()) {
        const cmd = commandMap[interaction.commandName];
        if (cmd) await cmd.execute(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith("color_")) {
        await handleColorButton(interaction);
    }
});

client.login(process.env.BOT_TOKEN);
