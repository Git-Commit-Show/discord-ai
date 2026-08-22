import { expect } from "chai";
import sinon from "sinon";

import config from "../src/config.js";
import { resetIntroductions } from "../src/middleware/duplicateDetector.js";
import { resetWelcomedUsers } from "../src/middleware/welcomeTracker.js";
import { llmApi } from "../src/services/llmService.js";
import {
    INTRO_CHANNEL_ID,
    createMessage,
    expectSilence,
    processMessage
} from "./helpers/messagePipeline.js";

const ERROR_REPLY = "⚠️ Sorry! Something went wrong.";

const JORDAN_INTRO =
    "Hi, I'm Jordan. I'm a software engineer, and I'm hoping to find a partner who speaks native English.";
const JORDAN_WELCOME =
    "Hello Jordan! Great to meet a software engineer looking for a native English-speaking partner. What kind of collaboration are you hoping to find?";

const PRIYA_INTRO =
    "Hi everyone! I am Priya from India. I have a technical team that focuses on software development.";
const PRIYA_WELCOME =
    "Hello Priya! It's great to have you join us from India with your software development team. What AI project are you currently working on?";

const SAM_INTRO = "Sam from earth\nAnd looking for network";
const SAM_WELCOME =
    "Hello Sam, welcome from Earth. What kind of network are you looking to build?";

describe("03 welcome and errors", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        resetWelcomedUsers();
        resetIntroductions();
        config.introChannelId = INTRO_CHANNEL_ID;

        sandbox.stub(llmApi, "detectSpam").resolves("SAFE");
        sandbox.stub(llmApi, "moderateIntroduction").resolves("APPROVE");
        sandbox.stub(llmApi, "generateIntroductionReply").resolves(JORDAN_WELCOME);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("welcomes a first intro and stays silent on later follow-ups", async () => {
        llmApi.generateIntroductionReply.callsFake(async (content) => {
            if (content === PRIYA_INTRO) {
                return PRIYA_WELCOME;
            }

            if (content === SAM_INTRO) {
                return SAM_WELCOME;
            }

            return JORDAN_WELCOME;
        });

        const jordan = createMessage({
            content: JORDAN_INTRO,
            userId: "jordan",
            username: "Jordan"
        });
        await processMessage(jordan);
        expect(jordan.reply.calledOnceWithExactly(JORDAN_WELCOME)).to.equal(true);

        const priya = createMessage({
            content: PRIYA_INTRO,
            userId: "priya",
            username: "Priya"
        });
        await processMessage(priya);
        expect(priya.reply.calledOnceWithExactly(PRIYA_WELCOME)).to.equal(true);

        const sam = createMessage({
            content: SAM_INTRO,
            userId: "sam",
            username: "Sam"
        });
        await processMessage(sam);
        expect(sam.reply.calledOnceWithExactly(SAM_WELCOME)).to.equal(true);

        for (const content of [
            "Tech",
            "Can i share whatsapp or other link like linkedin?"
        ]) {
            const followUp = createMessage({
                content,
                userId: "jordan",
                username: "Jordan"
            });
            await processMessage(followUp);
            expectSilence(followUp);
        }

        const threadedReply = createMessage({
            content: "Hi Bot, we mainly focus on RAG and Python.",
            userId: "jordan",
            username: "Jordan",
            reference: { messageId: jordan.id }
        });
        await processMessage(threadedReply);
        expectSilence(threadedReply);

        const samFollowUp = createMessage({
            content: "Tech",
            userId: "sam",
            username: "Sam"
        });
        await processMessage(samFollowUp);
        expectSilence(samFollowUp);
    });

    it("replies with the generic error when welcome generation throws", async () => {
        llmApi.generateIntroductionReply.rejects(new Error("LLM down"));

        const failedWelcome = createMessage({
            content: JORDAN_INTRO,
            userId: "error-user"
        });
        await processMessage(failedWelcome);

        expect(failedWelcome.reply.calledOnceWithExactly(ERROR_REPLY)).to.equal(true);
    });
});
