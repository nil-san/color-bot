import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { getColors, getPanel, updatePanelMessages } from "../database/colors.js";
import { parseLabel } from "../utils/label.js";

/**
 * Refreshes the color selection panel for a guild.
 * Handles multiple messages if more than 25 colors.
 */
export async function refreshColorPanel(guild) {
    const panel = getPanel(guild.id);
    if (!panel) return;

    try {
        const channel = await guild.channels.fetch(panel.channel_id);
        if (!channel?.isTextBased()) return;

        const colors = getColors(guild.id);
        if (!colors.length) {
            // If no colors, clear original message and delete extras
            const mainMessage = await channel.messages.fetch(panel.message_id).catch(() => null);
            if (mainMessage) await mainMessage.edit({ content: "❌ No colors available.", components: [] });

            if (panel.extra_message_ids?.length) {
                for (const msgId of panel.extra_message_ids) {
                    const msg = await channel.messages.fetch(msgId).catch(() => null);
                    if (msg) await msg.delete().catch(() => null);
                }
                updatePanelMessages(guild.id, []); // Clear extra message IDs
            }
            return;
        }

        // Split colors into chunks of 25 (max buttons per message)
        const chunkSize = 25;
        const colorChunks = [];
        for (let i = 0; i < colors.length; i += chunkSize) {
            colorChunks.push(colors.slice(i, i + chunkSize));
        }

        const allMessageIds = [];

        // Refresh the first message (original)
        const firstChunk = colorChunks.shift();
        const firstRows = buildButtonRows(firstChunk);
        const mainMessage = await channel.messages.fetch(panel.message_id);
        await mainMessage.edit({
            content: "🎨 Choose your color:",
            components: firstRows
        });
        allMessageIds.push(mainMessage.id);

        // Refresh or create extra messages
        const existingExtraIds = panel.extra_message_ids || [];
        for (let i = 0; i < colorChunks.length; i++) {
            const chunk = colorChunks[i];
            const rows = buildButtonRows(chunk);

            let msg;
            if (existingExtraIds[i]) {
                // Edit existing extra message
                msg = await channel.messages.fetch(existingExtraIds[i]).catch(() => null);
                if (msg) {
                    await msg.edit({ content: "🎨 Choose your color:", components: rows });
                } else {
                    msg = await channel.send({ content: "🎨 Choose your color:", components: rows });
                }
            } else {
                // Send new extra message
                msg = await channel.send({ content: "🎨 Choose your color:", components: rows });
            }

            allMessageIds.push(msg.id);
        }

        // Delete any leftover extra messages if colors decreased
        if (existingExtraIds.length > colorChunks.length) {
            for (let i = colorChunks.length; i < existingExtraIds.length; i++) {
                const msg = await channel.messages.fetch(existingExtraIds[i]).catch(() => null);
                if (msg) await msg.delete().catch(() => null);
            }
        }

        // Update panel in DB with all message IDs
        updatePanelMessages(guild.id, allMessageIds.slice(1)); // skip the main message
    } catch (err) {
        console.error(`Failed to refresh color panel for guild ${guild.id}:`, err);
    }
}

/**
 * Converts a color chunk into rows of buttons (max 5 per row)
 */
function buildButtonRows(colors) {
    const buttons = colors.map(c => {
        const button = new ButtonBuilder()
            .setCustomId(`color_${encodeURIComponent(c.name)}`)
            .setStyle(ButtonStyle.Secondary);

if (c.label) {
    const parsed = parseLabel(c.label);

    if (parsed) {
        if (parsed.type === "custom") {
            button.setEmoji({ id: parsed.id });
            button.setLabel(" "); // required safety for emoji-only buttons
        } else {
            button.setLabel(parsed.name);
        }
    } else {
        // Invalid label → fallback safely
        button.setLabel(c.name.toUpperCase());
    }
} else {
    button.setLabel(c.name.toUpperCase());
}


        return button;
    });

    // Split into rows of 5 buttons
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return rows;
}
