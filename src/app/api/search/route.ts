import { NextResponse } from "next/server";
import { buildApiUrl } from "@sttm/banidb";
import Fuse from "fuse.js";
// Helper: Sleep
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// 🌍 GLOBAL CACHE for Bani List (Lazy Loaded)
let cachedBaniList: any[] | null = null;
let lastFetchTime = 0;

// Helper: Normalize transliteration for better phonetic matching
function normalizeForMatch(text: string) {
    return text.toLowerCase()
        .replace(/\(n\)/g, 'n')
        .replace(/aa/g, 'a')
        .replace(/ee/g, 'i')
        .replace(/oo/g, 'u')
        .replace(/dh/g, 'd')
        .replace(/th/g, 't')
        .replace(/bh/g, 'b')
        .replace(/kh/g, 'k')
        .replace(/gh/g, 'g')
        .replace(/jh/g, 'j')
        .replace(/ph/g, 'p')
        .replace(/ch/g, 'c')
        .replace(/sh/g, 's')
        .replace(/rh/g, 'r')
        .replace(/w/g, 'v')
        .replace(/[^a-z0-9]/g, '');
}

// Helper: Strip Gurmukhi Matras to match user input style
function stripGurmukhiMatras(text: string) {
    // Keep 0A72 (Iri), 0A73 (Ura), 0A74 (Ek Onkar)
    return text.replace(/[\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A51\u0A70-\u0A71\u0A75]/g, "");
}

// 🗺️ MANUAL BANI MAP (Fallback/Priority for common Nitnem)
// IDs verified against GurbaniDB v2 API
const MANUAL_BANI_MAP: { [key: string]: number } = {
    "japji": 2,
    "japji sahib": 2,
    "jaap": 4,
    "jaap sahib": 4,
    "tav prasad": 6,
    "savaiye": 6,
    "chaupai": 9,
    "chaupai sahib": 9,
    "anand": 10,
    "anand sahib": 10,
    "rehras": 21,
    "rehras sahib": 21,
    "sohila": 23,
    "kirtan sohila": 23,
    "sohila sahib": 23,
    "ardaas": 24,
    "ardaas sahib": 24,
    "sukhmani": 31,
    "sukhmani sahib": 31,
    "asa di var": 11,
    "shabad hazare": 3,
    "shabad hazaare": 3,
    "salok mahala 9": 30,
};

// 💎 MANUAL KEYWORD/SHABAD MAP (For Simran or specific verses)
const MANUAL_KEYWORD_MAP: { [key: string]: number } = {
    "waheguru": 31020,
    "w w w": 31020,
    "www": 31020,
    "simran": 31020,
};

// Helper: Fetch Bani List from API (Auto-updates every 24h)
async function getBaniList() {
    const now = Date.now();
    if (cachedBaniList && (now - lastFetchTime < 86400000)) {
        return cachedBaniList;
    }

    try {
        const banisUrl = "https://api.banidb.com/v2/banis";
        const res = await fetch(banisUrl, {
            headers: {
                'User-Agent': 'GurbaniProjector/1.0',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
        });
        const data = await res.json();
        if (data) {
            let list = data;
            if (!Array.isArray(list) && data.banis) list = data.banis;
            cachedBaniList = list;
            lastFetchTime = now;
            return cachedBaniList || [];
        }
    } catch (e) {
        console.error("Failed to fetch Bani list", e);
    }
    return [];
}

export async function POST(req: Request) {
    let trimmedQuery = "";
    try {
        const body = await req.json();
        const { query, acronym, isAcronym } = body;

        if (!query || query.trim() === "") {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        trimmedQuery = query.trim().toLowerCase();

        console.log("🔍 [Backend] Received Query:", trimmedQuery);
        const isGurmukhi = /[\u0A00-\u0A7F]/.test(trimmedQuery);
        console.log("📝 [Backend] Mode:", isGurmukhi ? "Gurmukhi (PA)" : "English/Roman");

        if (isGurmukhi) {
            console.log("✂️ [Backend] Stripped Query (Matras Removed):", trimmedQuery); // calculated in frontend, verified here
        }


        // 1. 🤖 BANI DETECTION (Manual Map + Automatic)
        let manualBaniId: number | null = null;
        const sortedKeys = Object.keys(MANUAL_BANI_MAP).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
            if (trimmedQuery.includes(key)) {
                manualBaniId = MANUAL_BANI_MAP[key];
                break;
            }
        }

        const baniList = await getBaniList();
        let matchedBani: any = null;
        let baniId: number | null = manualBaniId;

        if (manualBaniId) {
            matchedBani = (baniList || []).find((b: any) => (b.id || b.baniID || b.ID) === manualBaniId) || { name: "Gurbani", id: manualBaniId };
        } else if (baniList && baniList.length > 0) {
            const baniFuse = new Fuse(baniList, {
                keys: ["name", "gurmukhi", "transliteration", "english"],
                threshold: 0.4,
                includeScore: true
            });

            const baniMatch = baniFuse.search(trimmedQuery);
            const containsMatch = baniList.find(b => {
                const name = (b.name || b.transliteration || "").toLowerCase();
                return name.length > 3 && (trimmedQuery === name || trimmedQuery.startsWith(name + " "));
            });

            if ((baniMatch.length > 0 && baniMatch[0].score! < 0.4) || containsMatch) {
                matchedBani = containsMatch || baniMatch[0].item;
                baniId = matchedBani.id || matchedBani.baniID || matchedBani.ID;
            }
        }

        if (baniId) {
            try {
                const baniUrl = `https://api.banidb.com/v2/banis/${baniId}`;
                const baniRes = await fetch(baniUrl, {
                    headers: { 'User-Agent': 'GurbaniProjector/1.0' }
                });
                const baniData = await baniRes.json();

                if (baniData && baniData.verses && baniData.verses.length > 0) {
                    const formattedLines = (baniData.verses || []).map((v: any) => {
                        const core = v.verse && typeof v.verse === 'object' && v.verse.verseId ? v.verse : v;
                        const textObj = core.verse && typeof core.verse === 'object' ? core.verse : core;
                        return {
                            id: core.verseId,
                            gurmukhi: textObj.unicode || textObj.gurmukhi || "",
                            transliteration: core.transliteration?.english || "",
                            translation: core.translation?.en?.bdb || core.translation?.en?.ms || "",
                            transliteration_hi: core.transliteration?.hindi || ""
                        };
                    }).filter((line: any) => line.gurmukhi !== "");

                    const firstLine = formattedLines[0];

                    // 🎯 SMART LINE MATCH: Jump to the spoken line within the Bani
                    let bestMatchedLine = firstLine;
                    let maxScore = 0;
                    const minLen = trimmedQuery.length <= 5 ? 1 : 2;
                    const queryWords = trimmedQuery.split(/\s+/).filter(w => w.length >= minLen);

                    if (queryWords.length > 0) {
                        for (const line of formattedLines) {
                            const lineT = normalizeForMatch(line.transliteration);
                            let score = 0;
                            queryWords.forEach(w => {
                                const nw = normalizeForMatch(w);
                                if (lineT.includes(nw)) score++;
                            });

                            if (score > maxScore) {
                                maxScore = score;
                                bestMatchedLine = line;
                            }
                        }
                    }

                    return NextResponse.json({
                        match: bestMatchedLine,
                        matchedLine: bestMatchedLine,
                        searchTypeUsed: 99,
                        shabad: {
                            id: baniId,
                            bani: (matchedBani ? (matchedBani.name || matchedBani.transliteration) : "Gurbani"),
                            lines: formattedLines
                        }
                    });
                }
            } catch (err) {
                console.log("Failed to fetch full Bani content", err);
            }
        }

        // B. Manual Keyword Check (For Simran/Explicit shortcuts)
        let manualShabadId: number | null = null;
        if (MANUAL_KEYWORD_MAP[trimmedQuery]) {
            manualShabadId = MANUAL_KEYWORD_MAP[trimmedQuery];
        }

        // 2. SEARCH LOGIC (If not a Bani command)
        let searchData: any = null;
        let successfulType = -1;
        let finalShabadId: number | null = manualShabadId;

        if (!finalShabadId) {
            // 🏗️ STRATEGY CONSTRUCTION
            // User Request: "Agar n sune (full text fail), to fir letters se search kare (fallback)"

            const isGurmukhi = /[\u0A00-\u0A7F]/.test(trimmedQuery);
            const getAcronym = (t: string) => t.split(/\s+/).map(w => w[0]).filter(Boolean).join("");
            const generatedAcronym = getAcronym(trimmedQuery);
            const wordCount = trimmedQuery.split(/\s+/).length;

            let strategies: any[] = [];

            if (isAcronym) {
                // If user explicitly asked for acronym (unlikely in voice flow, but possible via UI)
                strategies.push({ q: acronym || trimmedQuery, type: 1 });
                strategies.push({ q: acronym || trimmedQuery, type: 0 });
            } else {
                // 1. 🥇 PRIMARY: Full Text Search
                // Try to match the exact words spoken
                strategies.push({ q: trimmedQuery, type: 4 }); // Full Word/Fuzzy
                strategies.push({ q: trimmedQuery, type: 8 }); // Broad search

                // 2. 🥈 FALLBACK: First Letters (Acronym)
                // If full text fails, search using the first letter of each word
                if (wordCount > 1) {
                    strategies.push({ q: generatedAcronym, type: 1 }); // English First Letters
                    strategies.push({ q: generatedAcronym, type: 0 }); // Gurmukhi First Letters
                }
            }

            for (const strategy of strategies) {
                const searchUrl = buildApiUrl({
                    q: strategy.q,
                    type: strategy.type,
                    source: "all",
                    results: 50
                });

                try {
                    await sleep(300);
                    const response = await fetch(searchUrl, {
                        headers: { 'User-Agent': 'GurbaniProjector/1.0' },
                        signal: AbortSignal.timeout(5000)
                    });

                    const data = await response.json();

                    if (data.verses && data.verses.length > 0) {
                        const candidates = data.verses;
                        // 🔍 RIGOROUS CANDIDATE SELECTION
                        let bestCandidate = candidates[0];
                        let maxCandidateScore = -1;
                        const normalizedQuery = trimmedQuery.replace(/\s+/g, '').toLowerCase();

                        for (const cand of candidates) {
                            const trans = (cand.transliteration?.english || "").toLowerCase();
                            const normalizedTrans = normalizeForMatch(trans);

                            // Determine if we should match against Gurmukhi or English
                            const isGurmukhiInput = /[\u0A00-\u0A7F]/.test(trimmedQuery);
                            let lineAcronym = "";

                            if (isGurmukhiInput) {
                                const rawGText = (cand.gurmukhi?.unicode || cand.gurmukhi || "").trim();
                                const gText = stripGurmukhiMatras(rawGText);
                                lineAcronym = gText.split(/\s+/).map((w: string) => w[0] || "").join("");
                            } else {
                                lineAcronym = trans.split(/\s+/).map((w: string) => (w[0] || '').toLowerCase()).join("");
                            }

                            let currentScore = 0;

                            const isCurrentStrategyAcronym = isAcronym || strategy.type === 1 || strategy.type === 0;

                            if (isCurrentStrategyAcronym) {
                                // 1. Acronym Match (Highest Priority in Acronym mode)
                                if (lineAcronym === normalizedQuery) currentScore += 1000;
                                else if (lineAcronym.startsWith(normalizedQuery)) currentScore += 500;
                                else if (lineAcronym.includes(normalizedQuery)) currentScore += 200;

                                // 2. Phonetic Overlap
                                const common = [...normalizedQuery].filter(char => lineAcronym.includes(char)).length;
                                currentScore += (common / Math.max(normalizedQuery.length, 1)) * 100;
                            } else {
                                // 1. Full Text Match (Highest Priority in Full Mode)
                                if (normalizedTrans.includes(normalizeForMatch(trimmedQuery))) currentScore += 1000;

                                // 2. Word by Word match
                                const queryWords = trimmedQuery.split(/\s+/).filter(w => w.length >= 2);
                                let matchedWords = 0;
                                queryWords.forEach(w => {
                                    const nw = normalizeForMatch(w);
                                    if (normalizedTrans.includes(nw)) matchedWords++;
                                });
                                currentScore += (matchedWords / Math.max(queryWords.length, 1)) * 500;
                            }

                            if (currentScore > maxCandidateScore) {
                                maxCandidateScore = currentScore;
                                bestCandidate = cand;
                            }
                        }

                        // 🏆 HIGH-PRECISION CONFIDENCE SCORING
                        const calculateConfidence = (cand: any, targetQuery: string, treatAsAcronym: boolean) => {
                            const trans = (cand.transliteration?.english || "").toLowerCase();
                            const normalizedTrans = normalizeForMatch(trans);

                            const isGurmukhiInput = /[\u0A00-\u0A7F]/.test(targetQuery);
                            let lineAcronym = "";
                            if (isGurmukhiInput) {
                                const rawGText = (cand.gurmukhi?.unicode || cand.gurmukhi || "").trim();
                                const gText = stripGurmukhiMatras(rawGText);
                                lineAcronym = gText.split(/\s+/).map((w: string) => w[0] || "").join("");
                            } else {
                                lineAcronym = trans.split(/\s+/).map((w: string) => (w[0] || '').toLowerCase()).join("");
                            }

                            let maxScore = 0;

                            // 1. Acronym Score Check (Always try this, it's robust)
                            const queryAcronym = treatAsAcronym
                                ? targetQuery.replace(/\s+/g, '').toLowerCase() // Input is already acronym
                                : (isGurmukhiInput
                                    ? targetQuery.split(/\s+/).map(w => w[0]).join("")
                                    : targetQuery.split(/\s+/).map(w => w[0]).join("").toLowerCase());

                            let acronymScore = 0;
                            // Only trust acronym if it has enough length to be unique-ish
                            if (queryAcronym.length >= 3) {
                                if (lineAcronym === queryAcronym) acronymScore = 85;
                                else if (lineAcronym.startsWith(queryAcronym)) acronymScore = 70;
                                else if (lineAcronym.includes(queryAcronym)) acronymScore = 50;
                                else {
                                    const common = [...queryAcronym].filter(char => lineAcronym.includes(char)).length;
                                    acronymScore = (common / Math.max(queryAcronym.length, 1)) * 40;
                                }
                            }
                            maxScore = Math.max(maxScore, acronymScore);

                            // 2. Full Text Score Check (Only if input is full text)
                            if (!treatAsAcronym) {
                                let textScore = 0;
                                if (isGurmukhiInput) {
                                    // Gurmukhi Full Text Matching (Matra Stripped)
                                    const rawGText = (cand.gurmukhi?.unicode || cand.gurmukhi || "").trim();
                                    const gText = stripGurmukhiMatras(rawGText);
                                    const strippedTarget = stripGurmukhiMatras(targetQuery);

                                    if (gText === strippedTarget) textScore += 95;
                                    else if (gText.includes(strippedTarget) || strippedTarget.includes(gText)) textScore += 80;
                                } else {
                                    const normalizedTarget = normalizeForMatch(targetQuery);
                                    if (normalizedTrans === normalizedTarget) textScore += 95;
                                    else if (normalizedTrans.includes(normalizedTarget)) textScore += 80;

                                    const queryWords = targetQuery.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
                                    if (queryWords.length > 0) {
                                        let matchedWords = 0;
                                        queryWords.forEach(w => {
                                            if (normalizedTrans.includes(normalizeForMatch(w))) matchedWords++;
                                        });
                                        textScore += (matchedWords / queryWords.length) * 60;
                                    }
                                }
                                maxScore = Math.max(maxScore, textScore);
                            }

                            return Math.min(100, Math.round(maxScore));
                        };

                        const isCurrentStrategyAcronym = isAcronym || strategy.type === 1 || strategy.type === 0;
                        // Use the strategy's query (which is already the acronym in fallback) for scoring
                        const confidence = calculateConfidence(bestCandidate, strategy.q, isCurrentStrategyAcronym);

                        // 🎯 ADAPTIVE THRESHOLD: Lower for longer phrases to be more flexible
                        const threshold = trimmedQuery.length > 15 ? 45 : 55;

                        if (confidence >= threshold) {
                            searchData = { ...data, verses: [bestCandidate], confidence };
                            successfulType = strategy.type;
                            break;
                        } else {
                            searchData = null;
                        }
                    }
                } catch (e: any) {
                    continue;
                }
            }

            if (searchData && searchData.verses && searchData.verses.length > 0) {
                finalShabadId = searchData.verses[0].shabadId;
            }
        }

        if (!finalShabadId) {
            return NextResponse.json({ match: null, shabad: null });
        }

        // 4. Fetch full Shabad content
        const shabadUrl = `https://api.banidb.com/v2/shabads/${finalShabadId}`;
        const shabadResponse = await fetch(shabadUrl, {
            headers: { 'User-Agent': 'GurbaniProjector/1.0' }
        });
        const shabadData = await shabadResponse.json();

        if (!shabadData.verses) {
            return NextResponse.json({ match: null, shabad: null });
        }

        const formattedLines = shabadData.verses.map((v: any) => {
            const core = v.verse && typeof v.verse === 'object' && v.verse.verseId ? v.verse : v;
            const textObj = core.verse && typeof core.verse === 'object' ? core.verse : core;
            return {
                id: core.verseId,
                gurmukhi: textObj.unicode || textObj.gurmukhi || "",
                transliteration: core.transliteration?.english || "",
                translation: core.translation?.en?.bdb || core.translation?.en?.ms || "",
                transliteration_hi: core.transliteration?.hindi || ""
            };
        }).filter((line: any) => line.gurmukhi !== "");

        // Find the matched line to return it explicitly
        let matchedLine = formattedLines[0];
        if (searchData && searchData.verses && searchData.verses[0]) {
            const targetVerseId = searchData.verses[0].verseId;
            matchedLine = formattedLines.find((l: any) => l.id === targetVerseId) || formattedLines[0];
        } else {
            // Smart line match for manual keywords (e.g. "waheguru")
            let maxScore = 0;
            const minLen = trimmedQuery.length <= 5 ? 1 : 2;
            const queryWords = trimmedQuery.split(/\s+/).filter(w => w.length >= minLen);
            for (const line of formattedLines) {
                const lineT = normalizeForMatch(line.transliteration);
                let score = 0;
                queryWords.forEach(w => {
                    const nw = normalizeForMatch(w);
                    if (lineT.includes(nw)) score++;
                });
                if (score > maxScore) {
                    maxScore = score;
                    matchedLine = line;
                }
            }
        }

        return NextResponse.json({
            match: matchedLine,
            matchedLine: matchedLine,
            searchTypeUsed: successfulType,
            confidence: searchData?.confidence || 100,
            shabad: {
                id: finalShabadId,
                bani: shabadData.shabadInfo?.source?.english || "Gurbani",
                lines: formattedLines
            }
        });

    } catch (error: any) {
        const status = error.response ? error.response.status : 500;
        return NextResponse.json({ error: "Search failed", details: error.message }, { status: status });
    }
}
