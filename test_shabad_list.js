const https = require('https');

// Test if /shabads list exists
const url = "https://api.banidb.com/v2/shabads";

console.log("Testing Shabad List endpoint:", url);

https.get(url, (res) => {
    console.log("Status:", res.statusCode);
    if (res.statusCode !== 200) {
        console.log("Endpoint likely doesn't exist or requires parameters.");
        return;
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try { // It might be huge, so be careful logging
            const json = JSON.parse(data);
            console.log("Is Array?", Array.isArray(json));
            if (Array.isArray(json)) console.log("Length:", json.length);
            else console.log("Keys:", Object.keys(json));
        } catch (e) { }
    });
});
