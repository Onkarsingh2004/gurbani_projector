import mongoose from "mongoose";

// Force clear model to ensure schema updates take effect during development
if (mongoose.models.Shabad) {
    delete (mongoose.models as any).Shabad;
}

const LineSchema = new mongoose.Schema({
    gurmukhi: { type: String, required: true },
    transliteration: { type: String },
    translation: { type: String },
});

const ShabadSchema = new mongoose.Schema({
    bani: { type: String, required: true },
    raag: { type: String },
    lines: [LineSchema],
});

export default mongoose.model("Shabad", ShabadSchema);
