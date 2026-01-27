import { getColors, addColor } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { refreshColorPanel } from "../utils/panel.js";
import { parseLabel } from "../utils/label.js";

export const data = {
    name: "addcolor",
    description: "Add a new color role",
    options: [
        { name: "name", description: "Internal color name for use in list", type: 3, required: true },
        { name: "role", description: "Role to assign", type: 8, required: true },
        { name: "label", description: "Button label (emoji or text)", type: 3, required: false }
    ]
};

export async function execute(interaction) {
    if (!requireManageRoles(interaction)) {
        return interaction.reply({ content: "❌ You need Manage Roles permission.", flags: 64 });
    }

    const name = interaction.options.getString("name").toLowerCase();
    const role = interaction.options.getRole("role");
    let label = interaction.options.getString("label");

    const colors = getColors(interaction.guild.id);
    if (colors.some(c => c.name === name)) {
        return interaction.reply({ content: `❌ The color **${name}** already exists.`, flags: 64 });
    }

    // Validate label
    if (label) {
        const parsed = parseLabel(label);
        if (!parsed) {
            return interaction.reply({ content: "❌ Invalid label. Must be a valid emoji or text (no mixing).", flags: 64 });
        }
    }

    // Add color to DB
    addColor(interaction.guild.id, name, role.id, label);

    // Reply immediately to avoid interaction timeout
    await interaction.reply({ content: `✅ Color **${name}** added successfully.`, flags: 64 });

    // Refresh panel in the background
    refreshColorPanel(interaction.guild).catch(console.error);
}
