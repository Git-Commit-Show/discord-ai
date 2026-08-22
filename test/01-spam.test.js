import { expect } from "chai";
import sinon from "sinon";

import config from "../src/config.js";
import { resetIntroductions } from "../src/middleware/duplicateDetector.js";
import { resetWelcomedUsers } from "../src/middleware/welcomeTracker.js";
import { llmApi } from "../src/services/llmService.js";
import {
    INTRO_CHANNEL_ID,
    createMessage,
    processMessage
} from "./helpers/messagePipeline.js";

describe("01 spam", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        resetWelcomedUsers();
        resetIntroductions();
        config.introChannelId = INTRO_CHANNEL_ID;

        sandbox.stub(llmApi, "detectSpam").resolves("SAFE");
        sandbox.stub(llmApi, "moderateIntroduction").resolves("APPROVE");
        sandbox.stub(llmApi, "generateIntroductionReply").resolves("unused");
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("deletes spam, warns in-channel, and does not run introduction handling", async () => {
        llmApi.detectSpam.resolves("SPAM");

        const spam = createMessage({
            content: "free crypto airdrop click here",
            userId: "spammer",
            username: "Spammer",
            channelId: "general"
        });
        await processMessage(spam);

        expect(spam.delete.calledOnce).to.equal(true);
        expect(spam.channel.send.calledOnceWithExactly(
            "⚠️ <@spammer>, your message has been removed because it was detected as spam."
        )).to.equal(true);
        expect(spam.reply.called).to.equal(false);
        expect(llmApi.moderateIntroduction.called).to.equal(false);
    });
});
