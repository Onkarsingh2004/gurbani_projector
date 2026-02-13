const https = require('https');

const url = "https://api.banidb.com/v2/angs/1/1"; // Source 1 (SGGS), Ang 1
// Check: does this endpoint exist? Or is it different?
// Usually: /angs/{sourceID}/{angID}

console.log("Testing Ang endpoint:", url);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Ang 1 Data Keys:", Object.keys(json));
            if (json.page) {
                console.log("First Line:", json.page[0].verse.unicode);
            }
        } catch (e) { console.log("Failed", e); }
    });
});
