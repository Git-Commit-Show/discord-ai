import config from "../config.js";

/**
 * Assigns the configured new-member role when someone joins, if the role exists.
 */
export async function handleNewMemberJoin(member) {
    try {
        if (member.user.bot) return;

        if (!config.newMemberRoleId) {
            console.log("⏭ Skipping new-member role: NEW_MEMBER_ROLE_ID not configured.");
            return;
        }

        const role = member.guild.roles.cache.get(config.newMemberRoleId);

        if (!role) {
            console.log(
                `⏭ Skipping new-member role: role not found in ${member.guild.name}.`
            );
            return;
        }

        if (member.roles.cache.has(role.id)) return;

        await member.roles.add(role);

        console.log(
            `✅ Assigned '${role.name}' to ${member.user.tag} in ${member.guild.name}`
        );
    } catch (error) {
        console.error(
            `❌ Failed to assign new-member role to ${member.user.tag}:`,
            error.message
        );
    }
}
