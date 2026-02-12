import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Shabad from "@/model/shabad";
import axios from "axios";

export async function GET() {
    try {
        await connectDB();

        const response = await axios.get("https://api.banidb.com/v2/banis/2");
        const data = response.data;

        if (!data || !data.verses) {
            return NextResponse.json({ message: "Bani not found from API" }, { status: 404 });
        }

        const lines = data.verses.map((v: any) => {
            const vObj = v.verse;

            const gurmukhi = vObj?.verse?.unicode || "";
            // The API has transliteration inside v.verse
            const transliteration = vObj?.transliteration?.english || "";
            // The API has translation inside v.verse
            const translation = vObj?.translation?.en?.bdb || vObj?.translation?.en?.ms || "";

            return {
                gurmukhi,
                transliteration,
                translation
            };
        }).filter((line: any) => line.gurmukhi !== "");

        const formatted = {
            bani: data.baniInfo?.english || "Japji Sahib",
            raag: data.baniInfo?.raag?.english || "Jap",
            lines: lines,
        };

        // Remove old data to ensure clean import
        await Shabad.deleteMany({});

        // Create new entry
        await Shabad.create(formatted);

        return NextResponse.json({
            message: "Imported successfully with English translations",
            bani: formatted.bani,
            linesCount: lines.length
        });
    } catch (error: any) {
        return NextResponse.json({
            message: "Import failed",
            error: error.message
        }, { status: 500 });
    }
}
