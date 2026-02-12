
// Mock test for search logic via letters
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testSearch(query, isAcronym = true) {
    console.log(`\nTesting search for: "${query}" (isAcronym: ${isAcronym})`);
    try {
        const response = await fetch('https://localhost:3001/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, isAcronym })
        });
        const data = await response.json();
        if (data.match) {
            console.log(`✅ Match Found: ${data.match.gurmukhi}`);
            console.log(`   Letters detected: ${query.toUpperCase()}`);
            console.log(`   Source: ${data.shabad.bani}`);
        } else {
            console.log('❌ No Match Found');
        }
    } catch (e) {
        console.error('Error connecting to dev server:', e.message);
    }
}

async function runTests() {
    console.log("--- GURBANI PROJECTOR: FULL LINE (LETTERS) TEST ---");
    // Testing common Gurbani initials
    await testSearch('mkkp'); // Madho Keena Ko Patita
    await testSearch('assc'); // Aavo Sikhan Sant Chaliho
    await testSearch('mmj');  // Mere Madho Ji
    await testSearch('wgh');  // Waheguru
}

runTests();
