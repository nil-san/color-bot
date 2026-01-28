import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { getColors, updateColor } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { refreshColorPanel } from "../utils/panel.js";
import { parseLabel } from "../utils/label.js";

export const data = new SlashCommandBuilder()
  .setName("editcolor")
  .setDescription("Edit an existing color")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(option =>
    option
      .setName("old_name")
      .setDescription("Current color name to edit")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("new_name")
      .setDescription("New color name")
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName("label")
      .setDescription("New button label (emoji or text)")
      .setRequired(false)
  )
  .addRoleOption(option =>
    option
      .setName("role")
      .setDescription("New role to assign")
      .setRequired(false)
  );

export async function execute(interaction) {
    if (!requireManageRoles(interaction)) {
        return interaction.reply({
            content: "❌ Missing Manage Roles.",
            flags: 64
        });
    }

    const guildId = interaction.guild.id;

    const oldName = interaction.options.getString("old_name").toLowerCase().trim();
    const newName = interaction.options.getString("new_name")?.toLowerCase().trim();
    const role = interaction.options.getRole("role");
    let label = interaction.options.getString("label");

    // Validate label
    if (label) {
        const parsed = parseLabel(label);
        if (!parsed) {
            return interaction.reply({
                content: "❌ Invalid label. Must be a valid emoji or text (no mixing).",
                flags: 64
            });
        }
    }

    try {
        const changed = updateColor(
            guildId,
            oldName,
            role?.id,          // may be undefined
            label,             // may be undefined
            newName            // may be undefined
        );

        if (!changed) {
            return interaction.reply({
                content: `❌ Color **${oldName}** not found.`,
                flags: 64
            });
        }
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
            return interaction.reply({
                content: `❌ A color with the name **${newName}** already exists.`,
                flags: 64
            });
        }

        if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return interaction.reply({
                content: "❌ That role is already used by another color.",
                flags: 64
            });
        }

        throw err; // real bug
    }

    await interaction.reply({
        content: `✅ Color **${oldName}** updated successfully${newName ? ` → **${newName}**` : ""}.`,
        flags: 64
    });

    refreshColorPanel(interaction.guild).catch(console.error);
}
