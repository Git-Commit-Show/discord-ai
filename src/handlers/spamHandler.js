import { llmApi } from "../services/llmService.js";
import { wasMessageDeleted } from "../middleware/inFlightMessageTracker.js";

/** True when Discord says the message is already gone (code 10008). */
function isUnknownMessage(error) {
    return error?.code === 10008;
}

/** Removes a spam message if it is still present; ignores Unknown Message races. */
async function deleteSpamMessage(message) {
    if (wasMessageDeleted(message.id)) {
        console.log("Spam message already deleted");
        return;
    }

    try {
        await message.delete();
    } catch (error) {
        if (isUnknownMessage(error)) {
            console.log("Spam message already deleted");
            return;
        }

        throw error;
    }
}

export async function handleSpam(message) {

    try {

        // Ignore bot messages
        if (message.author.bot) return false;

        // Ignore empty messages
        if (!message.content.trim()) return false;

        console.log(`🔍 Checking message from ${message.author.username}`);

        const result = await llmApi.detectSpam(message.content);

        if (result === "SAFE") {
            console.log("✅ Message is SAFE");
            return false;
        }

        console.log("🚫 Spam Detected!");

        await deleteSpamMessage(message);

        // Warn the user
        await message.channel.send(
            `⚠️ ${message.author}, your message has been removed because it was detected as spam.`
        );

        return true;

    } catch (error) {

        console.error("Spam Handler Error:", error);

        // Don't block the bot if spam detection fails
        return false;
    }
}
