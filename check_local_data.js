// Need env before others
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI not set");
    process.exit(1);
}

const Schema = mongoose.Schema;

// Simplified stand-alone script with no tsx dependency issues
const LineSchema = new Schema({
    id: Number,
    gurmukhi: String,
    transliteration: String
});
const ShabadSchema = new Schema({
    shabadId: Number,
    lines: [LineSchema]
});
const Shabad = mongoose.models.Shabad || mongoose.model("Shabad", ShabadSchema);

async function run() {
    console.log("Connecting to", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const q = "Waheguru";
    console.log(`Searching for '${q}'...`);

    const results = await Shabad.find({
        $or: [
            { "lines.gurmukhi": { $regex: q, $options: "i" } },
            { "lines.transliteration": { $regex: q, $options: "i" } }
        ]
    }).limit(1).lean();

    console.log("Local Results:", results.length);
    if (results.length > 0) {
        const match = results[0];
        console.log("First Match Shabad ID:", match.shabadId);
        console.log("First Line:", match.lines[0].gurmukhi);
    } else {
        console.log("No local result found. Database might be empty or only partially downloaded.");
    }
    process.exit(0);
}

run();
