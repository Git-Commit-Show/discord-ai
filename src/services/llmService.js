import { ResilientLLM } from "resilient-llm";

import config from "../config.js"; 
import { spamSystemPrompt } from "../prompts/spamPrompt.js"; 

import {
    DEFAULT_MODEL,
    MAX_TOKENS,
    TEMPERATURE
} from "../constants.js";

import { introductionSystemPrompt } from "../prompts/introductionPrompt.js";

/** Shared LLM client; exported so unit tests can stub chat without live API calls. */
export const llm = new ResilientLLM({
    aiService: config.aiService,
    model: config.model || DEFAULT_MODEL,
    apiKey: config.openRouterApiKey,
    maxTokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    retries: 3,
    backoffFactor: 2
});

/** Reads trimmed text from an LLM chat response; empty when the model returns nothing. */
function getResponseText(response) {
    const content = response?.content;
    return typeof content === "string" ? content.trim() : "";
}

/** Logs spam/moderation fail-open so empty or failed LLM replies can be counted in production. */
function logUnprocessedClassification({ check, reason, fallback, response, error, userMessage }) {
    const content = response?.content;
    console.warn("[LLM_FAIL_OPEN]", {
        check,
        reason,
        fallback,
        contentType: content === null ? "null" : typeof content,
        error: error?.message || null,
        messageLength: typeof userMessage === "string" ? userMessage.length : 0
    });

    if (error) {
        console.error(error);
    }
}


// ==========================================
// Generate AI Welcome Message
// ==========================================

export async function generateIntroductionReply(userMessage) {

    const conversation = [
        {
            role: "system",
            content: introductionSystemPrompt
        },
        {
            role: "user",
            content: userMessage
        }
    ];

    const response = await llm.chat(conversation);
    const text = getResponseText(response);

    if (!text) {
        throw new Error("Empty response from LLM");
    }

    return text;
}



// ==========================================
// AI Moderation
// ==========================================

export async function moderateIntroduction(userMessage) {

    const conversation = [
        {
            role: "system",
            content: `
You are an AI moderation system for a Discord community.

Your ONLY job is to decide whether an introduction should be accepted.

Reject introductions containing:

- insults
- abusive language
- hate speech
- harassment
- bullying
- threats
- sexual content
- spam
- scams
- phishing
- advertisements
- self promotion
- promotional links
- Discord invite links
- Telegram links
- WhatsApp links
- crypto promotions
- referral links
- suspicious URLs
- malicious content

Return ONLY one of these two words.

APPROVE

or

REJECT

Do not explain.
Do not add punctuation.
Do not add any extra words.
`
        },
        {
            role: "user",
            content: userMessage
        }
    ];

    try {

        const response = await llm.chat(conversation);
        const result = getResponseText(response).toUpperCase();

        if (!result) {
            logUnprocessedClassification({
                check: "moderation",
                reason: "empty_response",
                fallback: "APPROVE",
                response,
                userMessage
            });
            return "APPROVE";
        }

        console.log("🛡️ Moderation Result:", result);

        if (result.includes("REJECT")) {
            return "REJECT";
        }

        return "APPROVE";

    } catch (error) {

        logUnprocessedClassification({
            check: "moderation",
            reason: "error",
            fallback: "APPROVE",
            error,
            userMessage
        });
        return "APPROVE";
    }
} 
// ==========================================
// AI Spam Detection
// ==========================================

export async function detectSpam(userMessage) {

    const conversation = [
        {
            role: "system",
            content: spamSystemPrompt
        },
        {
            role: "user",
            content: userMessage
        }
    ];

    try {

        const response = await llm.chat(conversation);
        const result = getResponseText(response).toUpperCase();

        if (!result) {
            logUnprocessedClassification({
                check: "spam",
                reason: "empty_response",
                fallback: "SAFE",
                response,
                userMessage
            });
            return "SAFE";
        }

        console.log("🚨 Spam Detection:", result);

        if (result.includes("SPAM")) {
            return "SPAM";
        }

        return "SAFE";

    } catch (error) {

        logUnprocessedClassification({
            check: "spam",
            reason: "error",
            fallback: "SAFE",
            error,
            userMessage
        });
        return "SAFE";
    }
}

/** Handler-facing LLM calls so tests can stub them without hitting live APIs. */
export const llmApi = {
    generateIntroductionReply,
    moderateIntroduction,
    detectSpam
};