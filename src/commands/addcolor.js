import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { addColor } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { refreshColorPanel } from "../utils/panel.js";
import { parseLabel } from "../utils/label.js";

export const data = new SlashCommandBuilder()
  .setName("addcolor")
  .setDescription("Add a new color role")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(option =>
    option
      .setName("name")
      .setDescription("Internal color name for use in list")
      .setRequired(true)
  )
  .addRoleOption(option =>
    option
      .setName("role")
      .setDescription("Role to assign")
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName("label")
      .setDescription("Button label (emoji or text)")
      .setRequired(false)
  );

export async function execute(interaction) {
    if (!requireManageRoles(interaction)) {
        return interaction.reply({
            content: "❌ You need Manage Roles permission.",
            flags: 64
        });
    }

    const name = interaction.options.getString("name").toLowerCase().trim();
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

    // Add color to DB (DB is source of truth)
    const result = addColor(interaction.guild.id, name, role.id, label);

    if (!result.ok) {
        if (result.reason === "NAME_EXISTS") {
            return interaction.reply({
                content: `❌ The color **${name}** already exists.`,
                flags: 64
            });
        }

        if (result.reason === "ROLE_ALREADY_USED") {
            return interaction.reply({
                content: "❌ That role is already used by another color.",
                flags: 64
            });
        }

        // fallback (should not happen)
        return interaction.reply({
            content: "❌ Failed to add color due to an unknown error.",
            flags: 64
        });
    }

    // Reply immediately to avoid interaction timeout
    await interaction.reply({
        content: `✅ Color **${name}** added successfully.`,
        flags: 64
    });

    // Refresh panel in the background
    refreshColorPanel(interaction.guild).catch(console.error);
}
