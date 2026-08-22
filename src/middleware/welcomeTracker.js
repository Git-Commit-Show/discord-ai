const welcomedUsers = new Set();

export function hasBeenWelcomed(userId) {
    return welcomedUsers.has(userId);
}

export function markAsWelcomed(userId) {
    welcomedUsers.add(userId);
}

/** Clears in-memory welcome records so tests start from an empty process. */
export function resetWelcomedUsers() {
    welcomedUsers.clear();
}