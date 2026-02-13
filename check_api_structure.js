const https = require('https');

const q = "waheguru";
const url = `https://api.banidb.com/v2/search?source=all&q=${q}&type=4&results=1`;

console.log("Checking API Response Structure:", url);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.verses && json.verses.length > 0) {
                const first = json.verses[0];
                console.log("Top Result Keys:", Object.keys(first));
                if (first.verse) console.log("Nested 'verse' keys:", Object.keys(first.verse));
                console.log("Direct 'gurmukhi'?", first.gurmukhi);
                console.log("Nested 'verse.unicode'?", first.verse ? first.verse.unicode : "N/A");
                console.log("Nested 'verse.gurmukhi'?", first.verse ? first.verse.gurmukhi : "N/A");
            } else {
                console.log("No verses found.");
            }
        } catch (e) { console.error(e); }
    });
});
