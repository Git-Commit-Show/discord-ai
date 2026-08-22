import { expect } from "chai";

import config from "../src/config.js";
import { generateIntroductionReply } from "../src/services/llmService.js";

/** True when .env has a real OpenRouter key, not an empty or example placeholder. */
function isUsableOpenRouterKey(key) {
    const value = typeof key === "string" ? key.trim() : "";
    return value.startsWith("sk-or-v1-") && !value.includes("xxxx");
}

const SAMPLE_INTRODUCTION = `Hello everyone!

I'm Shankar.

I'm a Computer Science student from India.

I enjoy AI, Machine Learning, Discord Bots and Open Source.

Happy to be here!`;

describe("generateIntroductionReply", function () {
    this.timeout(60_000);

    before(function () {
        if (!isUsableOpenRouterKey(config.openRouterApiKey)) {
            this.skip();
        }
    });

    it("returns a non-empty welcome for a valid introduction", async () => {
        try {
            const response = await generateIntroductionReply(SAMPLE_INTRODUCTION);

            expect(response).to.be.a("string").that.is.not.empty;
        } catch (error) {
            const message = error?.message || String(error);

            if (message.includes("401") || /user not found/i.test(message)) {
                throw new Error(
                    "OpenRouter returned 401 User not found. Set a valid OPENROUTER_API_KEY in .env from https://openrouter.ai/keys"
                );
            }

            throw error;
        }
    });

});
