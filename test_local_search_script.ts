import { connectDB } from "@/lib/mongodb";
import Shabad from "@/model/shabad";

async function testLocalSearch() {
    await connectDB();
    const q = "waheguru";
    console.log(`Searching for '${q}'...`);

    const results = await (Shabad as any).find({
        $or: [
            { "lines.gurmukhi": { $regex: q, $options: "i" } },
            { "lines.transliteration": { $regex: q, $options: "i" } }
        ]
    }).limit(1).lean();

    console.log("Local Results:", results.length);
    if (results.length > 0) {
        console.log("First match ID:", results[0].shabadId);
    }
    process.exit(0);
}

testLocalSearch();
