import { removeColor } from "../database/colors.js";
import { requireManageRoles } from "../utils/permissions.js";
import { refreshColorPanel } from "../utils/panel.js";

export const data = {
    name: "removecolor",
    description: "Remove a color role",
    options: [{ name: "name", type: 3, description: "Color name", required: true }]
};

export async function execute(interaction) {
    if (!requireManageRoles(interaction))
        return interaction.reply({ content: "❌ Missing Manage Roles.", flags: 64 });

    const name = interaction.options.getString("name").toLowerCase();
    const res = removeColor(interaction.guild.id, name);

    if (!res.changes)
        return interaction.reply({ content: "❌ Color not found.", flags: 64 });

    // 🔁 refresh AFTER DB change
    await refreshColorPanel(interaction.guild);

    return interaction.reply({
        content: `✅ Color **${name}** removed.`,
        flags: 64
    });
}
