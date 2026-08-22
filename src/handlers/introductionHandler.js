import config from "../config.js";
import { llmApi } from "../services/llmService.js";
import { validateIntroduction } from "../middleware/introductionValidator.js";
import { hasBeenWelcomed, markAsWelcomed } from "../middleware/welcomeTracker.js";
import { isDuplicateIntroduction, saveIntroduction } from "../middleware/duplicateDetector.js";
import { wasMessageDeleted } from "../middleware/inFlightMessageTracker.js";

/** True when Discord rejected a reply because the referenced message is gone. */
function isUnknownReferencedMessage(error) {
    if (error?.code === 10008) {
        return true;
    }

    if (error?.code !== 50035) {
        return false;
    }

    return JSON.stringify(error.rawError?.errors ?? {}).includes(
        "MESSAGE_REFERENCE_UNKNOWN_MESSAGE"
    );
}

/** True when the intro was deleted while we were still working on it. */
function skipDeletedIntroduction(message) {
    if (!wasMessageDeleted(message.id)) {
        return false;
    }

    console.log("Skipping introduction; message was deleted");
    return true;
}

/** Replies to an intro only if that message is still present. */
async function replyToIntroduction(message, content) {
    if (skipDeletedIntroduction(message)) {
        return false;
    }

    try {
        await message.reply(content);
        return true;
    } catch (error) {
        if (isUnknownReferencedMessage(error)) {
            console.log("Skipping reply; introduction message was deleted");
            return false;
        }

        throw error;
    }
}

export async function handleIntroduction(message) {
    try {

        console.log("========== HANDLE INTRODUCTION ==========");

        // Ignore bot messages
        if (message.author.bot) return;

        // Ignore empty messages
        if (!message.content?.trim()) return;

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

        const moderation = await llmApi.moderateIntroduction(message.content);

        console.log("Moderation:", moderation);

        if (skipDeletedIntroduction(message)) {
            return;
        }

        if (moderation === "REJECT") {
            await replyToIntroduction(
                message,
                "❌ Your introduction contains inappropriate or promotional content."
            );
            return;
        }

        const validation = validateIntroduction(message.content);

        console.log(validation);

        if (!validation.valid) {
            await replyToIntroduction(
                message,
                `❌ ${validation.reason}

Please include:
• Your name
• Where you're from
• Your interests`
            );
            return;
        }

        if (isDuplicateIntroduction(message.content)) {
            await replyToIntroduction(
                message,
                "⚠️ This introduction looks very similar to another introduction."
            );
            return;
        }

        if (skipDeletedIntroduction(message)) {
            return;
        }

        console.log("Generating AI reply...");

        await message.channel.sendTyping();

        const reply = await llmApi.generateIntroductionReply(message.content);

        console.log(reply);

        if (skipDeletedIntroduction(message)) {
            return;
        }

        const sent = await replyToIntroduction(message, reply);

        if (!sent) {
            return;
        }

        saveIntroduction(message.content);

        markAsWelcomed(message.author.id);

        console.log("Done");

    } catch (error) {

        console.error(error);

        if (isUnknownReferencedMessage(error) || wasMessageDeleted(message.id)) {
            return;
        }

        await replyToIntroduction(
            message,
            "⚠️ Sorry! Something went wrong."
        );
    }
} 