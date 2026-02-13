const mongoose = require('mongoose');
const https = require('https');
const { Schema } = mongoose;

// Mongoose Setup
const MONGODB_URI = "mongodb://localhost:27017/gurbani_projector";

const LineSchema = new Schema({
    id: Number,
    gurmukhi: { type: String, index: "text" },
    transliteration: { type: String, index: "text" },
    translation: String,
    larivaar: String,
    firstLetters: { type: String, index: true },
    visraam: String
});

const ShabadSchema = new Schema({
    shabadId: { type: Number, unique: true, index: true },
    source: { id: Number, english: String, gurmukhi: String },
    ang: { type: Number, index: true },
    writer: String,
    raag: String,
    lines: [LineSchema],
}, { timestamps: true });

ShabadSchema.index({ "lines.gurmukhi": "text", "lines.transliteration": "text" });
const Shabad = mongoose.models.Shabad || mongoose.model("Shabad", ShabadSchema);

const MAX_ANG = 1430;
const BATCH_SIZE = 5;

async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
}

function fetchAng(angId) {
    return new Promise((resolve) => {
        const url = `https://api.banidb.com/v2/angs/1/${angId}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                } else { resolve(null); }
            });
        }).on('error', () => resolve(null));
    });
}

function getAcronym(text) {
    return text.split(/\s+/).map(w => w[0]).join("");
}

async function processAng(angData, angNum) {
    if (!angData || !angData.page) return 0;
    const shabadsMap = {};
    angData.page.forEach(verse => {
        const shabadId = verse.shabadId;
        if (!shabadsMap[shabadId]) shabadsMap[shabadId] = [];
        shabadsMap[shabadId].push(verse);
    });

    let count = 0;
    for (const sId in shabadsMap) {
        const verses = shabadsMap[sId];
        const lines = verses.map(v => {
            const verseObj = v.verse;
            return {
                id: verseObj.verseId,
                gurmukhi: verseObj.unicode || "",
                transliteration: verseObj.transliteration?.english || "",
                translation: verseObj.translation?.en?.bdb || "",
                larivaar: verseObj.larivaar?.unicode || "",
                firstLetters: getAcronym(verseObj.transliteration?.english || ""),
                visraam: ""
            };
        });

        await Shabad.findOneAndUpdate(
            { shabadId: parseInt(sId) },
            {
                shabadId: parseInt(sId),
                source: { id: 1, english: "Guru Granth Sahib Ji", gurmukhi: "ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ" },
                ang: angNum,
                writer: verses[0].writer?.english || "",
                raag: verses[0].raag?.english || "",
                lines: lines
            },
            { upsert: true, new: true }
        );
        count++;
    }
    return count;
}

async function runImport() {
    await connectDB();
    console.log("🚀 Starting Robust SGGS Import...");

    for (let i = 1; i <= MAX_ANG; i += BATCH_SIZE) {
        let retries = 3;
        while (retries > 0) {
            try {
                const promises = [];
                for (let j = 0; j < BATCH_SIZE && (i + j) <= MAX_ANG; j++) {
                    const ang = i + j;
                    promises.push(fetchAng(ang).then(d => processAng(d, ang)));
                }
                const results = await Promise.all(promises);
                const batchCount = results.reduce((a, b) => a + b, 0);
                console.log(`✅ Processed Angs ${i}-${Math.min(i + BATCH_SIZE - 1, MAX_ANG)} | Updated: ${batchCount}`);
                await new Promise(r => setTimeout(r, 200));
                break;
            } catch (err) {
                console.error(`❌ Batch ${i} Failed. Retrying...`);
                retries--;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
    console.log("🎉 IMPORT COMPLETE!");
    process.exit(0);
}

runImport();
