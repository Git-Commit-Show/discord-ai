import { client } from "./bot.js";
import config from "./config.js";

import { handleIntroduction } from "./handlers/introductionHandler.js";
import { handleNewMemberJoin } from "./handlers/newMemberRoleHandler.js";
import { handleSpam } from "./handlers/spamHandler.js";
import { removeNewMemberRole } from "./jobs/removeNewMemberRole.js";

client.once("clientReady", async () => {

    console.log(`🤖 Logged in as ${client.user.tag}`);

    // Run once when the bot starts
    await removeNewMemberRole(client);

    // Run at the configured interval
    setInterval(async () => {
        await removeNewMemberRole(client);
    }, config.roleCleanupIntervalHours * 60 * 60 * 1000);

});

client.on("guildMemberAdd", async (member) => {
    await handleNewMemberJoin(member);
});

client.on("messageCreate", async (message) => {

    console.log("========== MESSAGE RECEIVED ==========");
    console.log("Author:", message.author.username);
    console.log("Channel:", message.channel.id);
    console.log("Content:", message.content);

    // AI Spam Detection
    const spam = await handleSpam(message);

    if (spam) {
        return;
    }

    // Introduction Handler
    await handleIntroduction(message);

});

client.login(config.discordToken);      