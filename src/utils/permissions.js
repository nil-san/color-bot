import { PermissionsBitField } from "discord.js";

export const requireManageRoles = interaction =>
    interaction.inGuild() &&
    interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)

