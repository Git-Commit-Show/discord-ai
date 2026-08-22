import { expect } from "chai";

import { validateIntroduction } from "../src/middleware/introductionValidator.js";

describe("validateIntroduction", () => {

    it("accepts a long enough introduction that includes a keyword", () => {
        const result = validateIntroduction(
            "Hi, I'm a student from India and I love open source."
        );

        expect(result).to.deep.equal({ valid: true });
    });

    it("rejects introductions that are too short", () => {
        const result = validateIntroduction("I'm a student");

        expect(result).to.deep.equal({
            valid: false,
            reason: "Your introduction is too short."
        });
    });

    it("rejects long messages that lack introduction keywords", () => {
        const result = validateIntroduction(
            "This is a long enough message but it never signals an introduction."
        );

        expect(result).to.deep.equal({
            valid: false,
            reason: "This doesn't look like an introduction."
        });
    });

});
