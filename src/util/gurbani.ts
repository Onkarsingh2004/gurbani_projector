import Fuse from "fuse.js";

/**
 * Normalizes and cleans spoken text for Gurbani matching.
 */
export const cleanTranscript = (text: string) => {
    let cleaned = text.toLowerCase().trim();
    cleaned = cleaned.replace(/([aeiou])\1+/gi, '$1');
    // Allow a-z, 0-9, and Gurmukhi characters (\u0A00-\u0A7F)
    cleaned = cleaned.replace(/[^a-z0-9\s\u0A00-\u0A7F]/g, '');

    // Remove Gurmukhi Matras AND Diacritics (Keep only Akhars + Ek Onkar)
    // Ranges: 
    // 0A01-0A03 (Sign Adak Bindi, Bindi, Visarga)
    // 0A3C (Nukta)
    // 0A3E-0A4D (Vowels: Kanna, Sihari, Bihari, ... Virama)
    // 0A51 (Udaat)
    // 0A70-0A71 (Tippi, Addak)
    // 0A75 (Yakash)
    // EXCLUDES: 0A72 (Iri), 0A73 (Ura), 0A74 (Ek Onkar)
    cleaned = cleaned.replace(/[\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A51\u0A70-\u0A71\u0A75]/g, "");

    // Stop words removal is DISABLED to ensure accurate Acronym generation (e.g. "Waheguru Ji Ka Khalsa" -> "WJKK")
    // const stopWords = ["ji", "haye", "da", "di", "de", "ne", "nu", "ki", "ka", "ke", "ko", "si", "hai", "han", "tha", "the", "thi"];
    // const stopWordsRegex = new RegExp(`\\b(${stopWords.join("|")})\\b`, "gi");
    // const potentialClean = cleaned.replace(stopWordsRegex, '').trim();
    // if (potentialClean.length > 0) cleaned = potentialClean;

    const numberMap: { [key: string]: string } = {
        "pahila": "1", "pehla": "1", "one": "1", "dooja": "2", "duja": "2", "two": "2",
        "teeja": "3", "trija": "3", "three": "3", "chautha": "4", "four": "4",
        "pa": "pa", // prevent 'pa' -> 'pa' confusion if existing
    };
    // Only apply number map to English words to avoid messing up Gurmukhi
    Object.keys(numberMap).forEach(word => {
        if (/^[a-z]+$/.test(word)) {
            cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'g'), numberMap[word]);
        }
    });

    return cleaned.replace(/\s+/g, ' ').trim();
};

/**
 * Detects if a transcript is likely noise, background talk, or unrelated English speech.
 */
export const isProbableNoise = (text: string) => {
    const t = text.toLowerCase().trim();
    if (t.length < 2) return true;

    // 1. Common English fillers & conversational noise to ignore
    const nonGurbaniWords = [
        "yeah", "okay", "hello", "hi", "testing", "mic", "check", "the", "and", "but",
        "actually", "maybe", "sorry", "wait", "um", "ah", "like", "know", "right",
        "just", "so", "then", "well", "think"
    ];

    const words = t.split(/\s+/);
    const fillerCount = words.filter(w => nonGurbaniWords.includes(w)).length;
    if (fillerCount / words.length > 0.5) return true;

    // 2. Repeating character detection (stuttering/noise)
    if (/(.)\1{3,}/.test(t)) return true;

    // 3. Relaxed Vowel/Consonant checks for varied voices
    // We remove strict density checks to allow softer or background voices
    return false;
};

/**
 * Generates an acronym (first letter of each word).
 */
export const getAcronym = (text: string) => {
    return cleanTranscript(text)
        .split(/\s+/)
        .map(word => word[0])
        .filter(Boolean)
        .join("");
};

/**
 * Optimized local matcher to find the next line in the current Shabad.
 * Uses both acronym and text matching for maximum accuracy.
 */
export const attemptLocalMatch = (text: string, currentResult: any) => {
    if (!currentResult?.shabad) return null;

    const cleanInput = cleanTranscript(text);
    const spokenAcronym = getAcronym(text);
    const spokenWords = cleanInput.split(" ");
    const isGurmukhiInput = /[\u0A00-\u0A7F]/.test(cleanInput);

    const lines = currentResult.shabad.lines;
    const currentIndex = lines.findIndex((l: any) => l.id === currentResult.match?.id);

    // Lookahead: Search next 15 lines for better flow (increased for longer paras)
    const contextSlice = lines.slice(Math.max(0, currentIndex), currentIndex + 15);

    for (const line of contextSlice) {
        let lineText = "";
        let lineAcronym = "";

        if (isGurmukhiInput && line.gurmukhi) {
            lineText = cleanTranscript(line.gurmukhi); // This will now strip matras from the DB line too!
            lineAcronym = getAcronym(line.gurmukhi);
        } else {
            lineText = cleanTranscript(line.transliteration || "");
            lineAcronym = getAcronym(line.transliteration || "");
        }

        let score = 0;
        const lineWords = lineText.split(" ");
        let matchedWords = 0;

        // 1. Word Match Score (80 points)
        if (lineWords.length > 0) {
            spokenWords.forEach(w => {
                if (w.length > 1 && lineText.includes(w)) matchedWords++;
            });
            score += (matchedWords / Math.max(spokenWords.length, 1)) * 80;
        }

        // 2. Acronym Score (20 points bonus)
        if (lineAcronym.includes(spokenAcronym) || spokenAcronym.includes(lineAcronym)) {
            score += 20;
        }

        // Return only if confidence is sufficient (requires significant word overlap)
        if (score >= 60 || (matchedWords > 0 && score >= 40)) {
            return { line, confidence: Math.round(score) };
        }
    }
    return null;
};
