import { expect } from "chai";
import sinon from "sinon";

import config from "../src/config.js";
import { handleIntroduction } from "../src/handlers/introductionHandler.js";
import { handleSpam } from "../src/handlers/spamHandler.js";
import { resetIntroductions } from "../src/middleware/duplicateDetector.js";
import {
    finishMessageProcessing,
    markMessageDeleted,
    resetInFlightMessages,
    startMessageProcessing,
    wasMessageDeleted
} from "../src/middleware/inFlightMessageTracker.js";
import {
    hasBeenWelcomed,
    resetWelcomedUsers
} from "../src/middleware/welcomeTracker.js";
import { llmApi } from "../src/services/llmService.js";

const INTRO_CHANNEL_ID = "intro-channel";
const INTRO = "Hi I'm Alex from Spain, software engineer interested in AI.";
const WELCOME = "Hello Alex! Welcome to the community.";

/** Discord 50035 payload when a reply targets a message that no longer exists. */
function unknownReferencedMessageError() {
    return {
        code: 50035,
        rawError: {
            message: "Invalid Form Body",
            code: 50035,
            errors: {
                message_reference: {
                    _errors: [{
                        code: "MESSAGE_REFERENCE_UNKNOWN_MESSAGE",
                        message: "Unknown message"
                    }]
                }
            }
        }
    };
}

/** Builds a Discord-like message so handler tests do not need a live client. */
function createMessage({
    content = INTRO,
    userId = "user-1",
    username = "Alex",
    channelId = INTRO_CHANNEL_ID
} = {}) {
    return {
        id: `msg-${userId}`,
        content,
        author: {
            id: userId,
            username,
            bot: false
        },
        channel: {
            id: channelId,
            send: sinon.stub().resolves(),
            sendTyping: sinon.stub().resolves()
        },
        reference: null,
        reply: sinon.stub().resolves(),
        delete: sinon.stub().resolves()
    };
}

/** Runs the same spam-then-intro order as src/index.js. */
async function processMessage(message) {
    startMessageProcessing(message.id);

    try {
        const spam = await handleSpam(message);

        if (spam) {
            return;
        }

        if (wasMessageDeleted(message.id)) {
            return;
        }

        await handleIntroduction(message);
    } finally {
        finishMessageProcessing(message.id);
    }
}

describe("skip reply when introduction message is gone", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        resetWelcomedUsers();
        resetIntroductions();
        resetInFlightMessages();
        config.introChannelId = INTRO_CHANNEL_ID;

        sandbox.stub(llmApi, "detectSpam").resolves("SAFE");
        sandbox.stub(llmApi, "moderateIntroduction").resolves("APPROVE");
        sandbox.stub(llmApi, "generateIntroductionReply").resolves(WELCOME);
    });

    afterEach(() => {
        sandbox.restore();
        resetInFlightMessages();
    });

    it("replies with a welcome when the introduction is still present", async () => {
        const message = createMessage();

        await processMessage(message);

        expect(message.reply.calledOnceWithExactly(WELCOME)).to.equal(true);
        expect(hasBeenWelcomed(message.author.id)).to.equal(true);
    });

    it("skips the welcome when another bot deletes the intro during processing", async () => {
        const message = createMessage({ userId: "deleted-user" });

        llmApi.detectSpam.callsFake(async () => {
            markMessageDeleted(message.id);
            return "SAFE";
        });

        await processMessage(message);

        expect(message.reply.called).to.equal(false);
        expect(llmApi.generateIntroductionReply.called).to.equal(false);
        expect(hasBeenWelcomed(message.author.id)).to.equal(false);
    });

    it("does not send an apology when Discord rejects the reply as an unknown message", async () => {
        const message = createMessage({ userId: "race-user" });
        message.reply.rejects(unknownReferencedMessageError());

        await processMessage(message);

        expect(message.reply.calledOnceWithExactly(WELCOME)).to.equal(true);
        expect(hasBeenWelcomed(message.author.id)).to.equal(false);
    });
});
