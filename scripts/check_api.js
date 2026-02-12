const axios = require('axios');
async function run() {
    try {
        const query = 'je je bhe pahil avataaraa';
        const url = `https://api.banidb.com/v2/search/${encodeURIComponent(query)}?source=all&searchtype=4&results=5`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'GurbaniProjector/1.0' } });
        if (res.data.verses) {
            res.data.verses.forEach((v, i) => {
                console.log(`${i}: [ID ${v.shabadId}] ${v.transliteration?.english}`);
            });
        } else {
            console.log("No results for Type 4. Trying Type 8...");
            const url8 = `https://api.banidb.com/v2/search/${encodeURIComponent(query)}?source=all&searchtype=8&results=5`;
            const res8 = await axios.get(url8, { headers: { 'User-Agent': 'GurbaniProjector/1.0' } });
            if (res8.data.verses) {
                res8.data.verses.forEach((v, i) => {
                    console.log(`${i}: [ID ${v.shabadId}] ${v.transliteration?.english}`);
                });
            } else {
                console.log("No results for Type 8 either.");
            }
        }
    } catch (e) { console.log(e.message); }
}
run();
