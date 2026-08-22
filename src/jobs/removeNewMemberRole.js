import { PermissionFlagsBits } from "discord.js";
import config from "../config.js";

const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Removes the new-member role from people who have been in the guild long enough.
 * Uses REST member listing (not gateway fetch) to avoid GuildMembersTimeout.
 */
export async function removeNewMemberRole(client) {
    console.log("======================================");
    console.log("Running New Member Role Cleanup...");
    console.log("======================================");

    if (!config.newMemberRoleId) {
        console.log("❌ NEW_MEMBER_ROLE_ID is not configured.");
        return;
    }

    for (const guild of client.guilds.cache.values()) {
        try {
            await cleanupGuild(guild);
        } catch (error) {
            console.error(`Role Cleanup Error (${guild.name}):`, error);
        }
    }

    console.log("======================================");
    console.log("Role Cleanup Finished.");
    console.log("======================================");
}

/**
 * Returns true when the bot can manage the target role in this guild.
 * Discord requires Manage Roles plus a higher role than the one being edited.
 */
function canManageRole(guild, role) {
    const me = guild.members.me;
    if (!me) {
        return {
            ok: false,
            reason: "Bot member not cached yet; retry on next cleanup run.",
        };
    }

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return {
            ok: false,
            reason:
                "Bot lacks Manage Roles. Re-invite with that permission (OAuth2 URL Generator), or grant it on the bot's role.",
        };
    }

    if (me.roles.highest.comparePositionTo(role) <= 0) {
        return {
            ok: false,
            reason: `Bot role '${me.roles.highest.name}' must sit above '${role.name}' in Server Settings → Roles (drag the bot role higher).`,
        };
    }

    return { ok: true };
}

/**
 * Scans one guild and strips the new-member role from eligible members.
 */
async function cleanupGuild(guild) {
    console.log(`Checking Guild: ${guild.name}`);

    const role = guild.roles.cache.get(config.newMemberRoleId);

    if (!role) {
        console.log(`❌ Role not found in ${guild.name}`);
        return;
    }

    const permissionCheck = canManageRole(guild, role);
    if (!permissionCheck.ok) {
        console.error(
            `⏭ Skipping role cleanup in ${guild.name}: ${permissionCheck.reason}`
        );
        return;
    }

    let removed = 0;
    let failed = 0;

    for await (const member of listAllMembers(guild)) {
        if (member.user.bot) continue;
        if (!member.roles.cache.has(role.id)) continue;
        if (!member.joinedAt) continue;

        const daysInServer = Math.floor(
            (Date.now() - member.joinedAt.getTime()) / ONE_DAY
        );

        if (daysInServer < config.newMemberDays) continue;

        try {
            await member.roles.remove(role);
            removed += 1;
            console.log(
                `✅ Removed '${role.name}' from ${member.user.tag} (${daysInServer} days)`
            );
        } catch (err) {
            failed += 1;
            console.error(
                `❌ Failed to remove role from ${member.user.tag}:`,
                err.message
            );
            // Hierarchy/permission issues hit everyone the same way - stop flooding logs.
            if (err.message === "Missing Permissions") {
                console.error(
                    `⏭ Aborting further cleanup in ${guild.name}: Missing Permissions (fix bot role order / Manage Roles).`
                );
                break;
            }
        }
    }

    console.log(
        `Role cleanup (${guild.name}): removed=${removed}, failed=${failed}`
    );
}

/**
 * Yields every guild member via REST pagination (`PAGINATION_SIZE` per page).
 */
async function* listAllMembers(guild) {
    let after;
    const pageSize = config.paginationSize;

    for (;;) {
        const batch = await guild.members.list({
            limit: pageSize,
            ...(after ? { after } : {}),
        });

        if (batch.size === 0) return;

        for (const member of batch.values()) {
            yield member;
        }

        after = batch.last().id;
        if (batch.size < pageSize) return;
    }
}
