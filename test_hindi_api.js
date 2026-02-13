const https = require('https');

const q = "वाहेगुरु"; // Hindi for Waheguru
const url = `https://api.banidb.com/v2/search?source=all&q=${encodeURIComponent(q)}&type=4&results=1`;

console.log("Checking API for Hindi Query:", q);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Results count:", json.verses ? json.verses.length : 0);
            if (json.verses && json.verses.length > 0) {
                console.log("First Match:", json.verses[0].transliteration.english);
            }
        } catch (e) { console.error(e); }
    });
});
