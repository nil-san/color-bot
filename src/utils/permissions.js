import { PermissionsBitField } from "discord.js";

export const requireManageRoles = interaction =>
    interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles);
