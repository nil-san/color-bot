import { getColors, updateColor } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { refreshColorPanel } from "../utils/panel.js";
import { parseLabel } from "../utils/label.js";

export const data = {
    name: "editcolor",
    description: "Edit an existing color",
    options: [
        { name: "old_name", type: 3, description: "Current color name to edit", required: true },
        { name: "new_name", type: 3, description: "New color name", required: false },
        { name: "label", type: 3, description: "New button label (emoji or text)", required: false },
        { name: "role", type: 8, description: "New role to assign", required: false }
    ]
};

export async function execute(interaction) {
    if (!requireManageRoles(interaction)) {
        return interaction.reply({ content: "❌ Missing Manage Roles.", flags: 64 });
    }

    const oldName = interaction.options.getString("old_name").toLowerCase();
    const newName = interaction.options.getString("new_name")?.toLowerCase();
    let label = interaction.options.getString("label");
    const role = interaction.options.getRole("role");

    const colors = getColors(interaction.guild.id);
    const existing = colors.find(c => c.name === oldName);
    if (!existing) {
        return interaction.reply({ content: `❌ Color **${oldName}** not found.`, flags: 64 });
    }

    // Check for name conflict if renaming
    if (newName && colors.some(c => c.name === newName && c.name !== oldName)) {
        return interaction.reply({ content: `❌ A color with the name **${newName}** already exists.`, flags: 64 });
    }

    // Validate label
    if (label) {
        const parsed = parseLabel(label);
        if (!parsed) {
            return interaction.reply({ content: "❌ Invalid label. Must be a valid emoji or text (no mixing).", flags: 64 });
        }
    }

    // Update the color
    updateColor(
        interaction.guild.id,
        oldName,
        role ? role.id : existing.role_id,
        label ?? existing.label,
        newName ?? oldName
    );

    // Reply immediately
    await interaction.reply({ content: `✅ Color **${oldName}** updated successfully${newName ? ` → **${newName}**` : ""}.`, flags: 64 });

    // Refresh panel in the background
    refreshColorPanel(interaction.guild).catch(console.error);
}
