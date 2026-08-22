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

const TOO_SHORT_REPLY = `❌ Your introduction is too short.

Please include:
• Your name
• Where you're from
• Your interests`;

const NOT_INTRO_REPLY = `❌ This doesn't look like an introduction.

Please include:
• Your name
• Where you're from
• Your interests`;

const MODERATION_REJECT_REPLY =
    "❌ Your introduction contains inappropriate or promotional content.";

const DUPLICATE_REPLY =
    "⚠️ This introduction looks very similar to another introduction.";

const JORDAN_INTRO =
    "Hi, I'm Jordan. I'm a software engineer, and I'm hoping to find a partner who speaks native English.";

const ALEX_INTRO =
    "Hi I'm Alex from Spain, software engineer interested in AI.";

const SAAS_PITCH =
    "Turn your SaaS idea into a functional, user-ready product fast. I handle the full journey… Ready to launch? Drop me a message.";
const NICHE_PITCH =
    "I've been working on a niche I genuinely believe in, and I’m looking for one person who’s just as serious about building something…";
const LONG_NON_INTRO =
    "hi @Bot hi please reply to me now about this channel";

describe("02 intro gates", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        resetWelcomedUsers();
        resetIntroductions();
        config.introChannelId = INTRO_CHANNEL_ID;

        sandbox.stub(llmApi, "detectSpam").resolves("SAFE");
        sandbox.stub(llmApi, "moderateIntroduction").resolves("APPROVE");
        sandbox.stub(llmApi, "generateIntroductionReply").resolves(
            "Hello Alex! What part of AI are you most excited about?"
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("stays silent for bots, empty messages, exact greetings, and other channels", async () => {
        const botMessage = createMessage({
            content: JORDAN_INTRO,
            userId: "other-bot",
            bot: true
        });
        await processMessage(botMessage);
        expectSilence(botMessage);
        expect(llmApi.detectSpam.called).to.equal(false);

        const empty = createMessage({ content: "", userId: "empty" });
        await processMessage(empty);
        expectSilence(empty);

        for (const greeting of [
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
        ]) {
            const message = createMessage({
                content: greeting,
                userId: `greet-${greeting}`
            });
            await processMessage(message);
            expectSilence(message);
        }

        const otherChannel = createMessage({
            content: JORDAN_INTRO,
            userId: "off-channel",
            channelId: "general"
        });
        await processMessage(otherChannel);
        expectSilence(otherChannel);
        expect(llmApi.detectSpam.called).to.equal(true);
    });

    it("coaches short or non-intro posts and blocks reject or duplicate intros", async () => {
        for (const content of ["Hello guys", "what is ur gender?", "hi @Bot hi"]) {
            const message = createMessage({ content, userId: `short-${content}` });
            await processMessage(message);
            expect(message.reply.calledOnceWithExactly(TOO_SHORT_REPLY)).to.equal(true);
        }

        const notIntro = createMessage({
            content: LONG_NON_INTRO,
            userId: "not-intro"
        });
        await processMessage(notIntro);
        expect(notIntro.reply.calledOnceWithExactly(NOT_INTRO_REPLY)).to.equal(true);

        llmApi.moderateIntroduction.resolves("REJECT");

        for (const content of [
            "r u stupid?",
            SAAS_PITCH,
            "Hi I'm looking for long term partner.",
            NICHE_PITCH,
            "how are you?",
            "?? Where is my intro",
            "@Bot go away"
        ]) {
            const message = createMessage({ content, userId: `reject-${content}` });
            await processMessage(message);
            expect(message.reply.calledOnceWithExactly(MODERATION_REJECT_REPLY)).to.equal(true);
        }

        llmApi.moderateIntroduction.resolves("APPROVE");

        const firstAlex = createMessage({ content: ALEX_INTRO, userId: "alex-1" });
        await processMessage(firstAlex);
        expect(firstAlex.reply.calledOnce).to.equal(true);

        const copyAlex = createMessage({ content: ALEX_INTRO, userId: "alex-2" });
        await processMessage(copyAlex);
        expect(copyAlex.reply.calledOnceWithExactly(DUPLICATE_REPLY)).to.equal(true);
    });
});
