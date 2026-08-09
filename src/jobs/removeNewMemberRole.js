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
 * Scans one guild and strips the new-member role from eligible members.
 */
async function cleanupGuild(guild) {
    console.log(`Checking Guild: ${guild.name}`);

    const role = guild.roles.cache.get(config.newMemberRoleId);

    if (!role) {
        console.log(`❌ Role not found in ${guild.name}`);
        return;
    }

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
            console.log(
                `✅ Removed '${role.name}' from ${member.user.tag} (${daysInServer} days)`
            );
        } catch (err) {
            console.error(
                `❌ Failed to remove role from ${member.user.tag}:`,
                err.message
            );
        }
    }
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
