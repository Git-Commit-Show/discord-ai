import sinon from "sinon";

const CONSOLE_METHODS = ["log", "warn", "error"];

/** True when logs are hidden with `npm test --silent` (npm sets loglevel, it does not forward --silent). */
export function shouldHideLogs() {
    return process.env.npm_config_loglevel === "silent"
        || process.env.npm_config_silent === "true"
        || process.argv.includes("--silent");
}

/** Restores any console methods this helper stubbed. */
function restoreConsole() {
    for (const method of CONSOLE_METHODS) {
        if (typeof console[method].restore === "function") {
            console[method].restore();
        }
    }
}

/** Optionally hides production console output so Mocha's reporter stays readable. */
export const mochaHooks = {
    beforeEach() {
        if (!shouldHideLogs()) {
            return;
        }

        for (const method of CONSOLE_METHODS) {
            sinon.stub(console, method);
        }
    },

    afterEach() {
        restoreConsole();
    }
};
