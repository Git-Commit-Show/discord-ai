import { expect } from "chai";
import { PermissionFlagsBits } from "discord.js";
import sinon from "sinon";

import { handleIntroduction } from "../../src/handlers/introductionHandler.js";
import { handleSpam } from "../../src/handlers/spamHandler.js";
import { shouldSkipAdminMessage } from "../../src/middleware/adminMessageGate.js";
import {
    finishMessageProcessing,
    startMessageProcessing,
    wasMessageDeleted
} from "../../src/middleware/inFlightMessageTracker.js";

export const INTRO_CHANNEL_ID = "intro-channel";
export const BOT_USER_ID = "bot-user";

let messageSeq = 0;

/** Builds a Discord-like message so handler tests do not need a live client. */
export function createMessage({
    content,
    userId = "user-1",
    username = "User",
    channelId = INTRO_CHANNEL_ID,
    bot = false,
    reference = null,
    admin = false,
    mentionBot = false,
    guildOwnerId = "owner-1"
} = {}) {
    messageSeq += 1;

    const mentionedUserIds = new Set(mentionBot ? [BOT_USER_ID] : []);

    return {
        id: `msg-${messageSeq}`,
        content,
        author: {
            id: userId,
            username,
            bot,
            toString() {
                return `<@${userId}>`;
            }
        },
        member: {
            permissions: {
                has(flag) {
                    return admin && flag === PermissionFlagsBits.Administrator;
                }
            }
        },
        mentions: {
            users: {
                has(id) {
                    return mentionedUserIds.has(id);
                }
            }
        },
        client: {
            user: { id: BOT_USER_ID }
        },
        guild: {
            ownerId: guildOwnerId
        },
        channel: {
            id: channelId,
            send: sinon.stub().resolves(),
            sendTyping: sinon.stub().resolves()
        },
        reference,
        reply: sinon.stub().resolves(),
        delete: sinon.stub().resolves()
    };
}

/** Runs the same spam-then-intro order as src/index.js. */
export async function processMessage(message) {
    if (shouldSkipAdminMessage(message)) {
        return;
    }

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

/** Asserts the bot neither replied, deleted, nor warned. */
export function expectSilence(message) {
    expect(message.reply.called).to.equal(false);
    expect(message.delete.called).to.equal(false);
    expect(message.channel.send.called).to.equal(false);
}
