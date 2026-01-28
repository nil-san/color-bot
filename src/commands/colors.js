import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { getColors, getPanel, savePanel } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("colors")
    .setDescription("Create or update the color panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
    if (!requireManageRoles(interaction))
        return interaction.reply({ content: "❌ Missing Manage Roles.", flags: 64 });

    const colors = getColors(interaction.guild.id);
    if (!colors.length) return interaction.reply({ content: "No colors configured.", flags: 64 });

    const buttons = colors.map(c =>
        new ButtonBuilder()
            .setCustomId(`color_${encodeURIComponent(c.name)}`)
            .setLabel(c.label || c.name.toUpperCase())
            .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    let repaired = false;
    let panel = getPanel(interaction.guild.id);

    try {
        if (!panel) throw new Error();
        const channel = await interaction.guild.channels.fetch(panel.channel_id);
        const message = await channel.messages.fetch(panel.message_id);
        await message.edit({ content: "🎨 Choose your color:", components: rows });
    } catch {
        repaired = true;
        const msg = await interaction.channel.send({
            content: "🎨 Choose your color:",
            components: rows
        });
        savePanel(interaction.guild.id, msg.channel.id, msg.id);
    }

    interaction.reply({
        content: repaired
            ? "⚠️ Panel was missing — recreated automatically."
            : "✅ Color panel updated.",
        flags: 64
    });
}
