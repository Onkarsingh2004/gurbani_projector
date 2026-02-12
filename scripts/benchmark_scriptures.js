
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testShabad(phrase, acronym) {
    console.log(`\n--- Testing: "${phrase}" (Letters: ${acronym.toUpperCase()}) ---`);
    try {
        const response = await fetch('https://localhost:3001/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: acronym, isAcronym: true })
        });
        const data = await response.json();
        if (data.match) {
            console.log(`✅ FOUND: ${data.match.gurmukhi}`);
            console.log(`   Source: ${data.shabad.bani}`);
            console.log(`   Confidence: ${data.confidence}%`);
        } else {
            console.log('❌ NOT FOUND');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function runTests() {
    console.log("=== GURBANI PROJECTOR: ALL SCRIPTURES BENCHMARK ===");

    // 1. Sri Guru Granth Sahib Ji
    await testShabad("Madho Keena Ko Patita", "mkkp");
    await testShabad("Mera Man Loche Gur", "mmlg");

    // 2. Dasam Granth
    await testShabad("Deh Shiva Bar Mohe", "dsbm");
    await testShabad("Mittar Pyare Nu", "mpn");

    // 3. Bhai Gurdas Ji
    await testShabad("Satigur Nanak Pragatya", "snp");

    // 4. Anand Sahib
    await testShabad("Anand Bhaya Meri Maye", "abmm");

    // 5. Salok Mahala 9
    await testShabad("Gun Gobind Gayo Nahi", "gggn");
}

runTests();
