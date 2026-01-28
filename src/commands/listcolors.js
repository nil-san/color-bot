import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { getColors } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";

export const data = new SlashCommandBuilder()
    .setName("listcolors")
    .setDescription("List all color roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(interaction) {
    if (!requireManageRoles(interaction)) {
        return interaction.reply({
            content: "❌ Missing Manage Roles.",
            flags: 64
        });
    }

    const colors = getColors(interaction.guild.id);

    if (!colors.length) {
        return interaction.reply({
            content: "No colors configured.",
            flags: 64
        });
    }

    return interaction.reply({
        content: "🎨 Colors:\n" +
            colors.map(c => `• ${c.name} → ${c.label || c.name}`).join("\n"),
        flags: 64
    });
}
