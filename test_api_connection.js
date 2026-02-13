const https = require('https');

const url = "https://api.banidb.com/v2/banis/2"; // Japji Sahib

console.log("Testing connection to:", url);

https.get(url, (res) => {
    console.log("Status Code:", res.statusCode);
    if (res.statusCode === 200) {
        console.log("✅ Connection Successful!");
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log("Data received:", json.baniInfo ? json.baniInfo.english : "Unknown");
            } catch (e) { console.error("Error parsing JSON", e); }
        });
    } else {
        console.error("❌ Connection Failed:", res.statusMessage);
    }
}).on('error', (e) => {
    console.error("❌ Network Error:", e.message);
});
