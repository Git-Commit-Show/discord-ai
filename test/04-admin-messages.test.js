import { expect } from "chai";
import sinon from "sinon";

import config from "../src/config.js";
import { resetIntroductions } from "../src/middleware/duplicateDetector.js";
import { resetWelcomedUsers } from "../src/middleware/welcomeTracker.js";
import { llmApi } from "../src/services/llmService.js";
import {
    BOT_USER_ID,
    INTRO_CHANNEL_ID,
    createMessage,
    expectSilence,
    processMessage
} from "./helpers/messagePipeline.js";

const ADMIN_INTRO =
    "Hi, I'm Jordan. I'm a software engineer, and I'm hoping to find a partner who speaks native English.";

describe("04 admin messages", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        resetWelcomedUsers();
        resetIntroductions();
        config.introChannelId = INTRO_CHANNEL_ID;

        sandbox.stub(llmApi, "detectSpam").resolves("SAFE");
        sandbox.stub(llmApi, "moderateIntroduction").resolves("APPROVE");
        sandbox.stub(llmApi, "generateIntroductionReply").resolves(
            "Hello Jordan! What kind of collaboration are you hoping to find?"
        );
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("leaves untagged admin and guild-owner messages unchanged", async () => {
        const adminMessage = createMessage({
            content: ADMIN_INTRO,
            userId: "admin-1",
            username: "Admin",
            admin: true
        });
        await processMessage(adminMessage);
        expectSilence(adminMessage);
        expect(llmApi.detectSpam.called).to.equal(false);

        const ownerMessage = createMessage({
            content: ADMIN_INTRO,
            userId: "owner-1",
            username: "Owner",
            guildOwnerId: "owner-1"
        });
        await processMessage(ownerMessage);
        expectSilence(ownerMessage);
        expect(llmApi.detectSpam.called).to.equal(false);
    });

    it("processes an admin message when the bot is specifically tagged", async () => {
        const taggedAdmin = createMessage({
            content: `<@${BOT_USER_ID}> ${ADMIN_INTRO}`,
            userId: "admin-1",
            username: "Admin",
            admin: true,
            mentionBot: true
        });
        await processMessage(taggedAdmin);

        expect(llmApi.detectSpam.calledOnce).to.equal(true);
        expect(taggedAdmin.reply.calledOnce).to.equal(true);
        expect(taggedAdmin.delete.called).to.equal(false);
    });

    it("still processes ordinary members who did not tag the bot", async () => {
        const memberMessage = createMessage({
            content: ADMIN_INTRO,
            userId: "member-1",
            username: "Member"
        });
        await processMessage(memberMessage);

        expect(llmApi.detectSpam.calledOnce).to.equal(true);
        expect(memberMessage.reply.calledOnce).to.equal(true);
    });
});
