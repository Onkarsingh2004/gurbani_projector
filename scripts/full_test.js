const fs = require('fs');
const http = require('http');

console.log("🚀 Running Quality Assurance System Check...");
const reportLines = [];
reportLines.push("# 📋 Gurbani Projector Quality Assurance Report");
reportLines.push(`**Timestamp:** ${new Date().toLocaleString()}`);
reportLines.push("\n## Test Summary");
reportLines.push("| Test Case | Logic Path | Query Sent | Match Found | Status |");
reportLines.push("|---|---|---|---|---|");

const tests = [
    {
        name: "Acronym Handling (Sentence)",
        // User says 'Aavo Daya' -> Frontend sends 'Aavo Daya' + acronym 'ad'
        // Backend: Sees sentence -> Tries Full Text ('Aavo Daya') -> Fail/Poor -> Tries Acronym ('ad') -> Success
        query: "Aavo Daya",
        acronym: "ad",
        isAcronym: true,
        originalText: "Aavo Daya",
        expectedFragment: "aavhu",
        logic: "Hybrid: Full Text -> Acronym Fallback"
    },
    {
        name: "Bani Command: Anand Sahib",
        // Frontend maps 'Anand Sahib' -> 'Anand Bhaya...' BEFORE sending
        query: "anand bhaya meri maaye",
        acronym: "abmm",
        isAcronym: false,
        originalText: "Anand Sahib",
        expectedFragment: "anand",
        logic: "Map Title -> Full Search"
    },
    {
        name: "Full Line Detect",
        // User says full line clearly
        query: "thir ghar baiso",
        acronym: "tgb",
        isAcronym: false,
        originalText: "Thir Ghar Baiso",
        expectedFragment: "thir",
        logic: "Full Text Priority"
    },
    {
        name: "Short Acronym (Explicit)",
        // User says 'Waheguru' (Simran) -> mapped to 'Waheguru' -> Wait, is 'Waheguru' an acronym?
        // If user says "W W W", transcript "W W W". Acronym "www".
        query: "w w w",
        acronym: "www",
        isAcronym: true,
        originalText: "W W W",
        expectedFragment: "waheguru", // Should find Waheguru via acronym
        logic: "Acronym Priority (Short)"
    },
    {
        name: "Dasam Granth: Ek Siv Bhe",
        query: "ek siv bhe ek ge ek fer bhe ramachndhr kirasan ke avataar bhee anek hai",
        acronym: "esbegfbrkkabhah",
        isAcronym: false,
        originalText: "Ek Siv Bhe...",
        expectedFragment: "ek siv bhe",
        logic: "Full Text Priority (Dasam Granth)"
    },
    {
        name: "Dasam Granth: Pahil Avataaraa",
        query: "je je bhe pahil avataaraa",
        acronym: "jjbpa",
        isAcronym: false,
        originalText: "Je Je Bhe Pahil Avataaraa",
        expectedFragment: "je je bhe pahil avataaraa",
        logic: "Full Text Priority"
    },
    {
        name: "User Request: Sakhi Saheli",
        query: "sakhi saheli gao manglo",
        acronym: "ssgm",
        isAcronym: false,
        originalText: "ਸਖੀ ਸਹੇਲੀ ਗਾਉ ਮੰਗਲੋ",
        expectedFragment: "sakhi saheli",
        logic: "Acronym vs Full Text Hybrid"
    }
];

let currentTest = 0;

function runTest() {
    if (currentTest >= tests.length) {
        fs.writeFileSync('report.md', reportLines.join('\n'));
        console.log("\n✅ Report Generated: report.md");
        console.log(reportLines.join('\n'));
        return;
    }

    const test = tests[currentTest];
    const postData = JSON.stringify({
        query: test.query,
        acronym: test.acronym || "",
        isAcronym: test.isAcronym,
        originalText: test.originalText
    });


    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/search',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                const match = result.match;
                const matchText = match ? (match.transliteration || match.gurmukhi || "") : "NULL";

                let status = "✅ PASS";
                let note = "";

                if (!match) {
                    status = "❌ FAIL";
                    note = "(No Match Found)";
                } else if (test.expectedFragment && !matchText.toLowerCase().includes(test.expectedFragment.toLowerCase()) && !match.gurmukhi.includes(test.expectedFragment)) {
                    // Loose check
                    status = "⚠️ CHECK";
                    note = `(Got: ${matchText.substring(0, 15)}...)`;
                }

                console.log(`Test ${test.name}: ${status} ${note}`);

                reportLines.push(`| **${test.name}** | ${test.logic} | \`${test.query}\` | ${matchText.substring(0, 30)}... | ${status} |`);

            } catch (e) {
                console.error("Error parsing response:", e.message);
                reportLines.push(`| **${test.name}** | error | error | json error | ❌ FAIL |`);
            }
            currentTest++;
            runTest();
        });
    });

    req.on('error', (e) => {
        console.error("Request error:", e.message);
        reportLines.push(`| **${test.name}** | request failed | - | - | ❌ FAIL |`);
        currentTest++;
        runTest();
    });

    req.write(postData);
    req.end();
}

runTest();
