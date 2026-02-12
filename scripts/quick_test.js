const http = require('http');

const postData = JSON.stringify({
    query: "thir ghar baiso",
    acronym: "tgb"
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
        console.log('Status:', res.statusCode);
        if (res.statusCode === 200) {
            const result = JSON.parse(data);
            console.log('✅ API Working!');
            console.log('Match found:', result.match ? result.match.transliteration.substring(0, 50) : 'NULL');
        } else {
            console.log('❌ Error:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request failed:', e.message);
});

req.write(postData);
req.end();
