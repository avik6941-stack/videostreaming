const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const multer = require("multer");
const videoRoutes = require("./routes/video");
const authRoutes = require("./routes/auth");
const statsRoutes = require("./routes/stats");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || (process.env.NODE_ENV === "production" ? null : "mongodb://127.0.0.1:27017/video-platform");

if (!mongoUri) {
  console.error("MongoDB is not configured. Add MONGODB_URI in the deployment environment.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/stats", statsRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === "Only video files are allowed") {
    return res.status(400).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});

mongoose.connect(mongoUri)
  .then(() => {
    app.listen(port, () => {
      console.log(`Video platform API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });