import {
    getColors,
    removeColorsByRole,
    clearWarningsForRole,
    getPanel,
    clearPanel
} from "../database/colors.js";

export async function startupCleanup(client) {
    for (const guild of client.guilds.cache.values()) {

        // ----- COLOR ROLES -----
        const colors = getColors(guild.id);

        for (const color of colors) {
            const role = guild.roles.cache.get(color.role_id);

            if (!role) {
                // Role was deleted
                removeColorsByRole(guild.id, color.role_id);
                clearWarningsForRole(guild.id, color.role_id);
                console.log(
                    `[CLEANUP] Removed color "${color.name}" (missing role)`
                );
            }
        }

        // ----- PANEL MESSAGE -----
        const panel = getPanel(guild.id);
        if (!panel) continue;

        const channel = guild.channels.cache.get(panel.channel_id);
        if (!channel) {
            clearPanel(guild.id);
            console.log(
                `[CLEANUP] Cleared panel (missing channel)`
            );
            continue;
        }

        try {
            await channel.messages.fetch(panel.message_id);
        } catch {
            clearPanel(guild.id);
            console.log(
                `[CLEANUP] Cleared panel (missing message)`
            );
        }
    }
}
