const https = require('https');

// Helper to calculate acronym
const getAcronym = (text) => text.split(/\s+/).map(w => w[0]).join("");

const queryFull = "ਸੋ ਸਤਿਗੁਰੁ ਪਿਆਰਾ ਮੇਰੇ ਨਾਲ ਹੈ";
const queryAcronym = getAcronym(queryFull); // ਸਸਪਮਨਹ

const testSearch = (q, type, label) => {
    const url = `https://api.banidb.com/v2/search?source=all&q=${encodeURIComponent(q)}&type=${type}&results=5`;
    console.log(`\n--- Testing ${label} (Type ${type}) | Query: ${q} ---`);

    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.verses && json.verses.length > 0) {
                    console.log(`✅ MATCH FOUND: ${json.verses.length} results`);
                    console.log(`   Top Result: ${json.verses[0].verse.gurmukhi}`);
                } else {
                    console.log(`❌ NO MATCH`);
                }
            } catch (e) { console.error("Error parsing", e); }
        });
    }).on('error', e => console.error(e));
};

// Test Strategies
// Type 1: ?
// Type 3: ?
// Type 4: ?
// Type 0: ? (if exists)

// 1. Full Text on various types
testSearch(queryFull, 1, "FullText T1");
testSearch(queryFull, 2, "FullText T2");
testSearch(queryFull, 3, "FullText T3");
testSearch(queryFull, 4, "FullText T4");

// 2. Acronym on various types
testSearch(queryAcronym, 1, "Acronym T1");
testSearch(queryAcronym, 2, "Acronym T2");
testSearch(queryAcronym, 3, "Acronym T3");
testSearch(queryAcronym, 4, "Acronym T4");
