import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { requireManageRoles } from "../utils/permissions.js";
import { clearColors, clearPanel } from "../database/colors.js";
import { refreshColorPanel } from "../utils/panel.js";

export const data = new SlashCommandBuilder()
  .setName("clearcolors")
  .setDescription("Remove all colors from this server")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles) ;

export async function execute(interaction) {
  if (!requireManageRoles(interaction)) {
    return interaction.reply({
      content: "❌ You need Manage Roles permission.",
      flags: 64,
    });
  }

  clearColors(interaction.guild.id);
  clearPanel(interaction.guild.id);

  // 🔁 refresh AFTER DB change
  await refreshColorPanel(interaction.guild);

  return interaction.reply({
    content: "✅ All colors have been cleared.",
    flags: 64,
  });
}
