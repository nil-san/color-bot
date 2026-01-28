import { getColors } from "../database/colors.js";
import { getBotMember, canManageRole } from "../utils/roles.js";
import {
    isRoleWarned,
    markRoleWarned,
    clearRoleWarning
} from "../database/colors.js";

const active = new Set();
const SUCCESS_FALLBACK = 0x57f287; // green
const ERROR_COLOR = 0xed4245;      // red
const PLEASE_WAIT = 0xFEE75C;      // yellow

export async function handleColorButton(interaction) {
    let userId;

    try {
        await interaction.deferUpdate();
        userId = interaction.user.id;

        if (active.has(userId)) {
            return interaction.followUp({
                embeds: [{
                    color: PLEASE_WAIT,
                    description: "⏳ Please wait..."
                }],
                flags: 64
            });
        }

        active.add(userId);

        const name = decodeURIComponent(
            interaction.customId.replace("color_", "")
        );

        const colors = getColors(interaction.guild.id);
        const chosen = colors.find(c => c.name === name);

        if (!chosen) {
            return interaction.followUp({
                embeds: [{
                    color: ERROR_COLOR,
                    description: "❌ Color not found."
                }],
                flags: 64
            });
        }

        const role = interaction.guild.roles.cache.get(chosen.role_id);
        const botMember = getBotMember(interaction);

        if (!canManageRole(botMember, role)) {
            return interaction.followUp({
                embeds: [{
                    color: ERROR_COLOR,
                    description: "❌ I can't assign that role."
                }],
                flags: 64
            });
        }

        const member = interaction.member;

        if (member.roles.cache.has(role.id)) {
            return interaction.followUp({
                embeds: [{
                    color: ERROR_COLOR,
                    description: "🎨 You already have this color."
                }],
                flags: 64
            });
        }

        const failedRoles = [];
        const fixedRoles = [];

        for (const c of colors) {
            const r = interaction.guild.roles.cache.get(c.role_id);
            if (!r) continue;

            if (!canManageRole(botMember, r)) {
                failedRoles.push(r);
                continue;
            }

            fixedRoles.push(r);

            if (member.roles.cache.has(r.id)) {
                await member.roles.remove(r.id).catch(() => null);
            }
        }

        for (const r of fixedRoles) {
            clearRoleWarning(interaction.guild.id, r.id);
        }

        const newFailures = [];

        for (const r of failedRoles) {
            if (!isRoleWarned(interaction.guild.id, r.id)) {
                markRoleWarned(interaction.guild.id, r.id);
                newFailures.push(r);
            }
        }

        if (newFailures.length) {
            const adminMsg =
                `⚠️ **Color role issue detected**\n\n` +
                newFailures
                    .map(r => `• ${r} is above the bot and cannot be managed`)
                    .join("\n") +
                `\n\nMove these roles below the bot to fix this.`;

            const channel =
                interaction.guild.systemChannel ??
                interaction.channel;

            channel?.send({ content: adminMsg }).catch(() => null);
        }

        await member.roles.add(role.id);

        await interaction.followUp({
            embeds: [{
                color: role.color || SUCCESS_FALLBACK,
                description: `✅ Color updated to ${role}`
            }],
            flags: 64
        });

    } catch (err) {
        console.error("Color button error:", err);

        // safe after deferUpdate
        try {
            await interaction.followUp({
                embeds: [{
                    color: ERROR_COLOR,
                    description: "❌ Something went wrong. Try again."
                }],
                flags: 64
            });
        } catch {}
    } finally {
        if (userId) active.delete(userId);
    }
}
