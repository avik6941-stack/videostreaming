const mongoose = require("mongoose");

const VisitorStatsSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    default: "global"
  },
  totalVisits: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("VisitorStats", VisitorStatsSchema);
