import { requireManageRoles } from "../utils/permissions.js";
import { generateColorListImage } from "../utils/generateColorListImage.js";
import {
    getColors,
    getColorListMessages,
    saveColorListMessages,
    clearColorListMessages
} from "../database/colors.js";

export const data = {
    name: "sendcolorlist",
    description: "Send or update the color list image (admin only)"
};

export async function execute(interaction) {
    // 🔒 Admin-only
    if (!requireManageRoles(interaction)) {
        return interaction.reply({
            content: "❌ You need **Manage Roles** permission.",
            flags: 64
        });
    }

    // ✅ Defer first
    await interaction.deferReply({ flags: 64 });

    const colors = getColors(interaction.guild.id);
    if (!colors.length) {
        return interaction.editReply({ content: "❌ No colors available." });
    }

    // Split colors into chunks of 25
    const chunkSize = 25;
    const colorChunks = [];
    for (let i = 0; i < colors.length; i += chunkSize) {
        colorChunks.push(colors.slice(i, i + chunkSize));
    }

    // Fetch stored messages (first + extras)
    const stored = getColorListMessages(interaction.guild.id);
    const storedMessages = stored ? [stored, ...stored.extra_message_ids] : [];

    const newMessageIds = [];

    for (let i = 0; i < colorChunks.length; i++) {
        const chunk = colorChunks[i];

        // Generate image with persistent numbering
        const buffer = await generateColorListImage(interaction.guild, chunk, i * chunkSize);
        if (!buffer) continue;

        let message;

        if (storedMessages[i]) {
            // Edit existing message if exists
            try {
                const channel = await interaction.guild.channels.fetch(storedMessages[i].channel_id);
                message = await channel.messages.fetch(storedMessages[i].message_id);

                await message.edit({
                    files: [{ attachment: buffer, name: `colors_${i + 1}.png` }]
                });

                newMessageIds.push({ channel_id: message.channel.id, message_id: message.id });
                continue;
            } catch {
                // Existing message no longer exists
                // We'll send a new message and overwrite later
            }
        }

        // Send new message
        message = await interaction.channel.send({
            files: [{ attachment: buffer, name: `colors_${i + 1}.png` }]
        });

        newMessageIds.push({ channel_id: message.channel.id, message_id: message.id });
    }

    // Save all messages in DB (first + extras)
    if (newMessageIds.length) {
        const [first, ...extras] = newMessageIds;
        saveColorListMessages(interaction.guild.id, first, extras);
    }

    return interaction.editReply({
        content: `✅ Color list sent/updated (${newMessageIds.length} message${newMessageIds.length > 1 ? "s" : ""}).`
    });
}
