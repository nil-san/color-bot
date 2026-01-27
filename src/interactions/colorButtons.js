import { getColors } from "../database/colors.js";

const active = new Set();

export async function handleColorButton(interaction) {
    const userId = interaction.user.id;

    if (active.has(userId)) {
        return interaction.reply({
            content: "⏳ Please wait...",
            flags: 64
        });
    }

    active.add(userId);

    try {
        const name = decodeURIComponent(interaction.customId.replace("color_", ""));
        const colors = getColors(interaction.guild.id);

        const chosen = colors.find(c => c.name === name);
        if (!chosen) {
            return interaction.reply({
                content: "❌ Color not found.",
                flags: 64
            });
        }

        const role = interaction.guild.roles.cache.get(chosen.role_id);
        if (!role || role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                content: "❌ I can't assign that role.",
                flags: 64
            });
        }

        const member = interaction.member;

        if (member.roles.cache.has(role.id)) {
            return interaction.reply({
                content: "🎨 You already have this color.",
                flags: 64
            });
        }

        for (const c of colors) {
            if (member.roles.cache.has(c.role_id)) {
                await member.roles.remove(c.role_id);
            }
        }

        await member.roles.add(role.id);

        await interaction.reply({
            content: `✅ Color updated to **${name.toUpperCase()}**`,
            flags: 64
        });

    } catch (err) {
        console.error("Color button error:", err);

        if (!interaction.replied) {
            await interaction.reply({
                content: "❌ Something went wrong. Try again.",
                flags: 64
            });
        }
    } finally {
        active.delete(userId);
    }
}
