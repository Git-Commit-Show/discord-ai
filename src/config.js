import dotenv from "dotenv";

dotenv.config();

console.log("==================================");
console.log("INTRO_CHANNEL_ID =", process.env.INTRO_CHANNEL_ID);
console.log("==================================");

export default {
    // Discord
    discordToken: process.env.DISCORD_TOKEN,
    introChannelId: process.env.INTRO_CHANNEL_ID,

    // AI
    aiService: process.env.AI_SERVICE,
    model: process.env.MODEL,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,

    // New Member Role Cleanup
    newMemberRoleId: process.env.NEW_MEMBER_ROLE_ID,
    newMemberDays: Number(process.env.NEW_MEMBER_DAYS || 7),

    // Cleanup Interval (Hours)
    roleCleanupIntervalHours: Number(
        process.env.ROLE_CLEANUP_INTERVAL_HOURS || 24
    ),

    // REST list page size (Discord max 1000)
    paginationSize: Math.min(
        1000,
        Math.max(1, Number(process.env.PAGINATION_SIZE || 1000))
    ),
}; 