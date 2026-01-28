import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { getColors, removeColor } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { refreshColorPanel } from "../utils/panel.js";

export const data = new SlashCommandBuilder()
  .setName("removecolor")
  .setDescription("Remove a color role")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(option =>
    option
      .setName("name")
      .setDescription("Color name to remove")
      .setRequired(true)
  );

export async function execute(interaction) {
    if (!requireManageRoles(interaction)) {
        return interaction.reply({
            content: "❌ You need Manage Roles permission.",
            flags: 64
        });
    }

    const name = interaction.options.getString("name").toLowerCase().trim();

    const colors = getColors(interaction.guild.id);
    const exists = colors.some(c => c.name === name);

    if (!exists) {
        return interaction.reply({
            content: `❌ Color **${name}** does not exist.`,
            flags: 64
        });
    }

    removeColor(interaction.guild.id, name);

    await interaction.reply({
        content: `🗑️ Color **${name}** removed.`,
        flags: 64
    });

    refreshColorPanel(interaction.guild).catch(console.error);
}
