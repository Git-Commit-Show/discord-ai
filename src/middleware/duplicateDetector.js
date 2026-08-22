const introductions = [];

const SIMILARITY_THRESHOLD = 0.8;

// Normalize text
function normalize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Jaccard Similarity
function calculateSimilarity(text1, text2) {

    const words1 = new Set(normalize(text1).split(" "));
    const words2 = new Set(normalize(text2).split(" "));

    const intersection = [...words1].filter(word => words2.has(word));

    const union = new Set([...words1, ...words2]);

    return intersection.length / union.size;
}

export function isDuplicateIntroduction(message) {

    for (const intro of introductions) {

        const similarity = calculateSimilarity(message, intro);

        if (similarity >= SIMILARITY_THRESHOLD) {

            return true;

        }
    }

    return false;
}

export function saveIntroduction(message) {

    introductions.push(message);

}

/** Clears saved intro fingerprints so tests start from an empty process. */
export function resetIntroductions() {
    introductions.length = 0;
}