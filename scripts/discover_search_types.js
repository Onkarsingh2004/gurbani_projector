
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testSearch(query, type) {
    console.log(`\nTesting search for: "${query}" (Type: ${type})`);
    const searchUrl = `https://api.banidb.com/v2/search/${query}?type=${type}&source=all`;
    try {
        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'GurbaniProjector/1.0' }
        });
        const data = await response.json();
        if (data.verses && data.verses.length > 0) {
            console.log(`✅ Match Found [Type ${type}]: ${data.verses[0].verse.unicode}`);
            console.log(`   Transliteration: ${data.verses[0].transliteration.english}`);
            return true;
        } else {
            console.log(`❌ No Match Found [Type ${type}]`);
            return false;
        }
    } catch (e) {
        console.error('Error:', e.message);
        return false;
    }
}

async function runTests() {
    console.log("--- SEARCH TYPE DISCOVERY ---");
    const queries = ['mkkp', 'assc', 'mmj'];
    // Types to check: 0 (Gurmukhi First Letter), 1 (English First Letter), 2 (Full Word Gurmukhi), 3 (Full Word English), 4 (English Sequence)
    for (const q of queries) {
        console.log(`--- Testing phrase letters: ${q} ---`);
        for (let t = 0; t <= 1; t++) {
            await testSearch(q, t);
        }
    }
}

runTests();
