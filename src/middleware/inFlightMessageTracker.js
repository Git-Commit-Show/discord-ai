const inFlightMessages = new Map();

/** Starts tracking a message so a later delete can cancel the reply. */
export function startMessageProcessing(messageId) {
    if (!inFlightMessages.has(messageId)) {
        inFlightMessages.set(messageId, { deleted: false });
    }
}

/** Marks an in-flight message as deleted by a user, mod, or another bot. */
export function markMessageDeleted(messageId) {
    const state = inFlightMessages.get(messageId);

    if (state) {
        state.deleted = true;
    }
}

/** True when the message was deleted while we were still processing it. */
export function wasMessageDeleted(messageId) {
    return inFlightMessages.get(messageId)?.deleted === true;
}

/** Stops tracking after processing finishes. */
export function finishMessageProcessing(messageId) {
    inFlightMessages.delete(messageId);
}

/** Clears in-flight tracking so tests start from an empty process. */
export function resetInFlightMessages() {
    inFlightMessages.clear();
}
