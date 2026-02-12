const axios = require('axios');
const fs = require('fs');

function log(message) {
    console.log(message);
    fs.appendFileSync('test-results.txt', message + '\n');
}

async function testQuery(query, description) {
    log(`\n-----------------------------------`);
    log(`🔍 Testing: "${query}" (${description})`);
    try {
        const start = Date.now();
        const res = await axios.post('http://localhost:3000/api/search', {
            query: query
        });
        const duration = Date.now() - start;

        const data = res.data;
        if (data.match) {
            log(`✅ MATCH FOUND in ${duration}ms!`);
            log(`   Source: ${data.shabad.bani}`);
            log(`   Gurmukhi: ${data.match.gurmukhi}`);
            log(`   Translit: ${data.match.transliteration}`);
            log(`   Confidence: ${data.confidence}%`);
            log(`   Search Type: ${data.searchTypeUsed} (1=Acronym, 0=Acronym, 4=FullText, 8=Broad)`);

            if (data.searchTypeUsed === 1 || data.searchTypeUsed === 0) {
                log("   🎉 SUCCESS: Used Fallback (Acronym) Search!");
            } else {
                log("   ℹ️ Used Standard Full Text Search");
            }
        } else {
            log(`❌ NO MATCH (Time: ${duration}ms)`);
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log("❌ ERROR: Connection Refused. Is the server running on port 3000?");
            process.exit(1);
        } else {
            log("❌ ERROR: " + error.message);
            if (error.response) {
                log("   Status: " + error.response.status);
                log("   Data: " + JSON.stringify(error.response.data));
            }
        }
    }
}

async function runTests() {
    // Clear previous results
    fs.writeFileSync('test-results.txt', '');
    log("🚀 Starting Search API Tests...\n");

    // 1. Standard Easy Search
    await testQuery("dhan dhan ramdas gur", "Perfect Match Expectation");

    // 2. Tricky Search (Requires Fallback)
    // "tati vao na lagi" -> "thathai vaao n lagee"
    await testQuery("tati vao na lagi", "Fallback Test 1: Phonetic Mismatch (tati vao)");

    // 3. Another Tricky One
    // "jo mange thakur apne te" -> "jo maangeh thaakur apunae thae"
    await testQuery("jo mange thakur apne te", "Fallback Test 2: Vowel Differences");

    // 4. Broken/Partial Line
    // "santa ke karaj aap khaloya" -> "santaa kae kaaraj aap khaloeiaa"
    await testQuery("santa ke karaj aap khaloya", "Fallback Test 3: Common variant");
}

runTests();
