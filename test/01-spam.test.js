import { expect } from "chai";
import sinon from "sinon";

import config from "../src/config.js";
import { resetIntroductions } from "../src/middleware/duplicateDetector.js";
import {
    markMessageDeleted,
    resetInFlightMessages
} from "../src/middleware/inFlightMessageTracker.js";
import { resetWelcomedUsers } from "../src/middleware/welcomeTracker.js";
import { llmApi } from "../src/services/llmService.js";
import {
    INTRO_CHANNEL_ID,
    createMessage,
    processMessage
} from "./helpers/messagePipeline.js";

/** Discord 10008 payload when DELETE targets a message that no longer exists. */
function unknownMessageError() {
    return {
        code: 10008,
        status: 404,
        rawError: { message: "Unknown Message", code: 10008 }
    };
}

describe("01 spam", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        resetWelcomedUsers();
        resetIntroductions();
        resetInFlightMessages();
        config.introChannelId = INTRO_CHANNEL_ID;

        sandbox.stub(llmApi, "detectSpam").resolves("SAFE");
        sandbox.stub(llmApi, "moderateIntroduction").resolves("APPROVE");
        sandbox.stub(llmApi, "generateIntroductionReply").resolves("unused");
    });

    afterEach(() => {
        sandbox.restore();
        resetInFlightMessages();
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

    it("still warns and skips intro when Discord says the spam message is already gone", async () => {
        llmApi.detectSpam.resolves("SPAM");

        const spam = createMessage({
            content: "free crypto airdrop click here",
            userId: "spammer",
            username: "Spammer",
            channelId: "general"
        });
        spam.delete.rejects(unknownMessageError());

        await processMessage(spam);

        expect(spam.delete.calledOnce).to.equal(true);
        expect(spam.channel.send.calledOnce).to.equal(true);
        expect(llmApi.moderateIntroduction.called).to.equal(false);
    });

    it("does not call delete when the spam message was removed during detection", async () => {
        const spam = createMessage({
            content: "free crypto airdrop click here",
            userId: "spammer",
            username: "Spammer",
            channelId: "general"
        });

        llmApi.detectSpam.callsFake(async () => {
            markMessageDeleted(spam.id);
            return "SPAM";
        });

        await processMessage(spam);

        expect(spam.delete.called).to.equal(false);
        expect(spam.channel.send.calledOnce).to.equal(true);
        expect(llmApi.moderateIntroduction.called).to.equal(false);
    });
});
