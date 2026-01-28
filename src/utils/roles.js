// Returns the bot's GuildMember or null if unavailable
export function getBotMember(interaction) {
    return interaction.guild.members.resolve(interaction.client.user.id) ?? null;
}

// Checks whether the bot can manage a role
export function canManageRole(botMember, role) {
    if (!botMember || !role) return false;
    return role.position < botMember.roles.highest.position;
}