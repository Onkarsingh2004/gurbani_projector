const mongoose = require('mongoose');

const uri = "mongodb://localhost:27017/gurbani_projector";

console.log("Attempting to connect to MongoDB at", uri);

mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 })
    .then(() => {
        console.log("✅ MongoDB Connection Successful!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Failed:", err.message);
        process.exit(1);
    });
