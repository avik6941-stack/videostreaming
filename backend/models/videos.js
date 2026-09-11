const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema({
  title: String,
  filename: String,
  mimeType: String,
  youtubeUrl: String,
  videoUrl: String,
  category: {
    type: String,
    enum: ["general", "education", "music", "gaming", "news", "entertainment"],
    default: "general"
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Video", VideoSchema);