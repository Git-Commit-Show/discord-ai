import { llmApi } from "../services/llmService.js";

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

        // Delete spam message
        await message.delete();

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