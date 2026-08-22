import config from "../config.js";
import { generateIntroductionReply, moderateIntroduction } from "../services/llmService.js";
import { validateIntroduction } from "../middleware/introductionValidator.js";
import { hasBeenWelcomed, markAsWelcomed } from "../middleware/welcomeTracker.js";
import { isDuplicateIntroduction, saveIntroduction } from "../middleware/duplicateDetector.js";

export async function handleIntroduction(message) {
    try {

        console.log("========== HANDLE INTRODUCTION ==========");

        // Ignore bot messages
        if (message.author.bot) return;

        // Ignore replies
        if (message.reference) return;

        const ignoredMessages = [
            "hi",
            "hello",
            "hey",
            "welcome",
            "thanks",
            "thank you",
            "nice",
            "cool",
            "yo",
            "sup",
            "good morning",
            "good afternoon",
            "good evening"
        ];

        if (ignoredMessages.includes(message.content.toLowerCase().trim())) {
            console.log("Greeting ignored");
            return;
        }

        // Channel Check
        const expected = String(config.introChannelId).trim();
        const received = String(message.channel.id).trim();

        console.log("Expected:", JSON.stringify(expected));
        console.log("Received:", JSON.stringify(received));
        console.log("Equal:", expected === received);

        if (expected !== received) {
            console.log("Wrong Channel");
            return;
        }

        console.log("Correct Channel");

        // Already welcomed: skip without a canned reply so follow-ups stay quiet
        if (hasBeenWelcomed(message.author.id)) {
            return;
        }

        console.log("Running Moderation...");

        const moderation = await moderateIntroduction(message.content);

        console.log("Moderation:", moderation);

        if (moderation === "REJECT") {
            await message.reply(
                "❌ Your introduction contains inappropriate or promotional content."
            );
            return;
        }

        const validation = validateIntroduction(message.content);

        console.log(validation);

        if (!validation.valid) {
            await message.reply(
                `❌ ${validation.reason}

Please include:
• Your name
• Where you're from
• Your interests`
            );
            return;
        }

        if (isDuplicateIntroduction(message.content)) {
            await message.reply(
                "⚠️ This introduction looks very similar to another introduction."
            );
            return;
        }

        console.log("Generating AI reply...");

        await message.channel.sendTyping();

        const reply = await generateIntroductionReply(message.content);

        console.log(reply);

        await message.reply(reply);

        saveIntroduction(message.content);

        markAsWelcomed(message.author.id);

        console.log("Done");

    } catch (error) {

        console.error(error);

        await message.reply(
            "⚠️ Sorry! Something went wrong."
        );
    }
} 