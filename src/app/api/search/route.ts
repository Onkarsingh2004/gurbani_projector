import { NextResponse } from "next/server";
import { buildApiUrl } from "@sttm/banidb";
import Fuse from "fuse.js";
import fs from "fs";
import path from "path";

// Helper: Logger
const logFile = path.join(process.cwd(), "search-debug.log");
function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logMsg);
    console.log(message);
}
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
    // Gurmukhi Keys (New)
    "ਜਪੁ": 2, "ਜਪ": 2, "ਜਪੁਜੀ": 2, "ਜਪੁ ਜੀ ਸਾਹਿਬ": 2,
    "ਜਾਪੁ": 4, "ਜਾਪ": 4, "ਜਾਪੁ ਸਾਹਿਬ": 4,
    "ਤ੍ਵ ਪ੍ਰਸਾਦਿ": 6, "ਸਵਯੇ": 6,
    "ਚੌਪਈ": 9, "ਚੌਪਈ ਸਾਹਿਬ": 9, "ਕਬਯੋਬਾਚ ਬੇਨਤੀ ਚੌਪਈ": 9,
    "ਅਨੰਦ": 10, "ਅਨੰਦੁ": 10, "ਅਨੰਦ ਸਾਹਿਬ": 10,
    "ਰਹਿਰਾਸ": 21, "ਸੋਦਰੁ": 21, "ਸੋਦਰ": 21, "ਰਹਿਰਾਸ ਸਾਹਿਬ": 21,
    "ਸੋਹਿਲਾ": 23, "ਕੀਰਤਨ ਸੋਹਿਲਾ": 23,
    "ਅਰਦਾਸ": 24,
    "ਸੁਖਮਨੀ": 31, "ਸੁਖਮਨੀ ਸਾਹਿਬ": 31,
    "ਆਸਾ ਦੀ ਵਾਰ": 11,
    "ਸ਼ਬਦ ਹਜ਼ਾਰੇ": 3, "ਸ਼ਬਦ ਹਜਾਰੇ": 3,
    "ਸਲੋਕ ਮਹਲਾ ੯": 30, "ਸਲੋਕ ਮਹਲਾ 9": 30,
    "ਬਾਰਹ ਮਾਹਾ": 136,
    "ਲਾਵਾਂ": 773,
    "ਆਰਤੀ": 13
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

// Helper: Convert Hindi (Devanagari) to Gurmukhi
function hindiToGurmukhi(text: string) {
    const map: { [key: string]: string } = {
        // Vowels
        'अ': 'ਅ', 'आ': 'ਆ', 'इ': 'ਇ', 'ई': 'ਈ', 'उ': 'ਉ', 'ऊ': 'ਊ', 'ए': 'ਏ', 'ऐ': 'ਐ', 'ओ': 'ਓ', 'औ': 'ਔ',
        // Consonants
        'क': 'ਕ', 'ख': 'ਖ', 'ग': 'ਗ', 'घ': 'ਘ', 'ङ': 'ਙ',
        'च': 'ਚ', 'छ': 'ਛ', 'ज': 'ਜ', 'झ': 'ਝ', 'ञ': 'ਞ',
        'ट': 'ਟ', 'ठ': 'ਠ', 'ड': 'ਡ', 'ढ': 'ਢ', 'ण': 'ਣ',
        'त': 'ਤ', 'थ': 'ਥ', 'द': 'ਦ', 'ध': 'ਧ', 'न': 'ਨ',
        'प': 'ਪ', 'फ': 'ਫ', 'ब': 'ਬ', 'भ': 'ਭ', 'म': 'ਮ',
        'य': 'ਯ', 'र': 'ਰ', 'ल': 'ਲ', 'व': 'ਵ', 'श': 'ਸ਼', 'ष': 'ਸ਼', 'स': 'ਸ', 'ह': 'ਹ',
        // Matras
        'ा': 'ਾ', 'ि': 'ਿ', 'ी': 'ੀ', 'ु': 'ੁ', 'ू': 'ੂ', 'े': 'ੇ', 'ै': 'ੈ', 'ो': 'ੋ', 'ौ': 'ੌ',
        '्': '੍', 'ं': 'ੰ', 'ः': 'ਃ', '़': '਼', 'ँ': 'ੱ' // Chandrabindu approx to Adhak
    };
    return text.split('').map(char => map[char] || char).join('');
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

        // 🟢 HINDI DETECTION & CONVERSION
        const isHindi = /[\u0900-\u097F]/.test(trimmedQuery);
        if (isHindi) {
            const converted = hindiToGurmukhi(trimmedQuery);
            log(`🇮🇳 [Backend] Detected Hindi: ${trimmedQuery} -> Converted to Gurmukhi: ${converted}`);
            trimmedQuery = converted;
        }

        log(`🔍 [Backend] Received Query: ${trimmedQuery}`);
        const isGurmukhi = /[\u0A00-\u0A7F]/.test(trimmedQuery);
        log(`📝 [Backend] Mode: ${isGurmukhi ? "Gurmukhi (PA)" : "English/Roman"}`);

        if (isGurmukhi) {
            log(`✂️ [Backend] Stripped Query (Matras Removed): ${trimmedQuery}`);
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
            const isGurmukhi = /[\u0A00-\u0A7F]/.test(trimmedQuery);
            const getAcronym = (t: string) => t.split(/\s+/).map(w => w[0]).filter(Boolean).join("");
            const generatedAcronym = getAcronym(trimmedQuery);
            const wordCount = trimmedQuery.split(/\s+/).length;

            let strategies: any[] = [];

            if (isAcronym) {
                strategies.push({ q: acronym || trimmedQuery, type: 1 });
                strategies.push({ q: acronym || trimmedQuery, type: 0 });
            } else if (isGurmukhi) {
                // 1. Full Line Fuzzy Search (Best for full speech)
                strategies.push({ q: trimmedQuery, type: 4 });

                const gAcronym = trimmedQuery.split(/\s+/).map(w => w[0]).join("");
                strategies.push({ q: gAcronym, type: 3 });
                if (wordCount > 1) {
                    strategies.push({ q: generatedAcronym, type: 0 });
                }
            } else {
                strategies.push({ q: trimmedQuery, type: 4 });
                strategies.push({ q: trimmedQuery, type: 2 });
                if (wordCount > 1) {
                    strategies.push({ q: generatedAcronym, type: 1 });
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
                                if (lineAcronym === normalizedQuery) currentScore += 1000;
                                else if (lineAcronym.startsWith(normalizedQuery)) currentScore += 500;
                                else if (lineAcronym.includes(normalizedQuery)) currentScore += 200;
                                const common = [...normalizedQuery].filter(char => lineAcronym.includes(char)).length;
                                currentScore += (common / Math.max(normalizedQuery.length, 1)) * 100;
                            } else {
                                if (normalizedTrans.includes(normalizeForMatch(trimmedQuery))) currentScore += 1000;
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

                            const queryAcronym = treatAsAcronym
                                ? targetQuery.replace(/\s+/g, '').toLowerCase()
                                : (isGurmukhiInput
                                    ? targetQuery.split(/\s+/).map(w => w[0]).join("")
                                    : targetQuery.split(/\s+/).map(w => w[0]).join("").toLowerCase());

                            let acronymScore = 0;
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

                            if (!treatAsAcronym) {
                                let textScore = 0;
                                if (isGurmukhiInput) {
                                    const rawGText = (cand.gurmukhi?.unicode || cand.gurmukhi || "").trim();
                                    const gText = stripGurmukhiMatras(rawGText);
                                    const strippedTarget = stripGurmukhiMatras(targetQuery);

                                    if (gText === strippedTarget) textScore += 95;
                                    else if (gText.includes(strippedTarget) || strippedTarget.includes(gText)) textScore += 80;

                                    const queryWords = strippedTarget.split(/\s+/).filter(w => w.length >= 2);
                                    if (queryWords.length > 0) {
                                        let matchedWords = 0;
                                        queryWords.forEach(w => {
                                            if (gText.includes(w)) matchedWords++;
                                        });
                                        const wordScore = (matchedWords / queryWords.length) * 85;
                                        textScore = Math.max(textScore, wordScore);
                                    }
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
                        const confidence = calculateConfidence(bestCandidate, strategy.q, isCurrentStrategyAcronym);
                        const threshold = trimmedQuery.length > 15 ? 45 : 55;

                        if (confidence >= threshold) {
                            log(`✅ [Backend] Match Found (Confidence: ${confidence}) for strategy ${strategy.type}`);
                            searchData = { ...data, verses: [bestCandidate], confidence };
                            successfulType = strategy.type;
                            break;
                        } else {
                            log(`⚠️ [Backend] Match Discarded (Low Confidence: ${confidence} < ${threshold})`);
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

        let matchedLine = formattedLines[0];
        if (searchData && searchData.verses && searchData.verses[0]) {
            const targetVerseId = searchData.verses[0].verseId;
            matchedLine = formattedLines.find((l: any) => l.id === targetVerseId) || formattedLines[0];
        } else {
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
        log(`❌ [Backend] Error: ${error.message}`);
        const status = error.response ? error.response.status : 500;
        return NextResponse.json({ error: "Search failed", details: error.message }, { status: status });
    }
}
