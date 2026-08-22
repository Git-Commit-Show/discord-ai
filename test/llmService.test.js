import { expect } from "chai";
import sinon from "sinon";

import { detectSpam, llm } from "../src/services/llmService.js";

describe("detectSpam", () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Keep fail-open assertions working when console is not already stubbed by --silent.
        if (typeof console.warn.restore !== "function") {
            sandbox.stub(console, "warn").callThrough();
        }

        if (typeof console.error.restore !== "function") {
            sandbox.stub(console, "error").callThrough();
        }
    });

    afterEach(() => {
        sandbox.restore();
    });

    it("returns SPAM when the model classifies the message as spam", async () => {
        sandbox.stub(llm, "chat").resolves({ content: "SPAM" });

        const result = await detectSpam("free crypto airdrop click here");

        expect(result).to.equal("SPAM");
        expect(console.warn.calledWith("[LLM_FAIL_OPEN]")).to.equal(false);
    });

    it("fails open as SAFE and logs when the model returns null content", async () => {
        sandbox.stub(llm, "chat").resolves({ content: null });

        const result = await detectSpam("hello there");

        expect(result).to.equal("SAFE");
        expect(console.warn.calledWith("[LLM_FAIL_OPEN]")).to.equal(true);
        expect(console.warn.firstCall.args[1]).to.include({
            check: "spam",
            reason: "empty_response",
            fallback: "SAFE",
            contentType: "null"
        });
    });

    it("fails open as SAFE and logs when the model call throws", async () => {
        sandbox.stub(llm, "chat").rejects(new Error("provider timeout"));

        const result = await detectSpam("hello there");

        expect(result).to.equal("SAFE");
        expect(console.warn.calledWith("[LLM_FAIL_OPEN]")).to.equal(true);
        expect(console.warn.firstCall.args[1]).to.include({
            check: "spam",
            reason: "error",
            fallback: "SAFE",
            error: "provider timeout"
        });
    });
});
