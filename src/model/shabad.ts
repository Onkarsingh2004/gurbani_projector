import mongoose from "mongoose";

// Force clear to allow schema updates
if (mongoose.models.Shabad) {
    delete (mongoose.models as any).Shabad;
}

const LineSchema = new mongoose.Schema({
    id: String,
    gurmukhi: String,
    transliteration: String,
    translation: String,
    larivaar: String
});

const ShabadSchema = new mongoose.Schema({
    shabadId: Number,
    bani: String,
    raag: String,
    page: Number,
    lines: [LineSchema]
}, { timestamps: true });

export default mongoose.models.Shabad || mongoose.model("Shabad", ShabadSchema);
