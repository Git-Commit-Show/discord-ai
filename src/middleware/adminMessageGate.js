import { PermissionFlagsBits } from "discord.js";

/** True when the author owns the guild or has Discord Administrator permission. */
function isGuildAdmin(message) {
    if (message.guild?.ownerId && message.author?.id === message.guild.ownerId) {
        return true;
    }

    return Boolean(
        message.member?.permissions?.has?.(PermissionFlagsBits.Administrator)
    );
}

/** True when this message directly @mentions the bot user (not @everyone or a role). */
function isBotTagged(message) {
    const botId = message.client?.user?.id;

    if (!botId) {
        return false;
    }

    return Boolean(message.mentions?.users?.has?.(botId));
}

/** Skip the pipeline for admin posts unless they specifically tagged the bot. */
export function shouldSkipAdminMessage(message) {
    if (!isGuildAdmin(message)) {
        return false;
    }

    return !isBotTagged(message);
}
