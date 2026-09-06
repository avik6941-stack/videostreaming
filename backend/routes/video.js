const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Video = require("../models/videos");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const uploadDirectory = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only video files are allowed"));
  }
});

function getYoutubeId(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace("www.", "");
    if (hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
    if (hostname !== "youtube.com" && hostname !== "m.youtube.com") return null;
    if (url.pathname === "/watch") return url.searchParams.get("v");
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
    return null;
  } catch (error) {
    return null;
  }
}

const categories = ["general", "education", "music", "gaming", "news", "entertainment"];

router.post("/upload", requireAuth, upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "A video file is required" });
  }

  const video = new Video({
    title: req.body.title || req.file.originalname,
    filename: req.file.filename,
    category: categories.includes(req.body.category) ? req.body.category : "general"
  });

  try {
    await video.save();
  } catch (error) {
    fs.unlinkSync(req.file.path);
    throw error;
  }

  return res.status(201).json({
    success: true,
    video
  });
});

router.post("/youtube", requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const youtubeUrl = String(req.body.youtubeUrl || "").trim();
    const category = categories.includes(req.body.category) ? req.body.category : "general";
    const youtubeId = getYoutubeId(youtubeUrl);

    if (!title || !youtubeId) {
      return res.status(400).json({ error: "A title and valid YouTube link are required" });
    }

    const video = await Video.create({ title, youtubeUrl, category });
    return res.status(201).json({ success: true, video });
  } catch (error) {
    return next(error);
  }
});

router.post("/link", requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    const videoUrl = String(req.body.videoUrl || "").trim();
    const category = categories.includes(req.body.category) ? req.body.category : "general";

    try {
      const parsedUrl = new URL(videoUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
    } catch (error) {
      return res.status(400).json({ error: "A title and valid video link are required" });
    }

    if (!title) return res.status(400).json({ error: "A title and valid video link are required" });
    const video = await Video.create({ title, videoUrl, category });
    return res.status(201).json({ success: true, video });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res) => {
  const videos = await Video.find().sort({ uploadDate: -1 });
  return res.json(videos);
});

router.get("/:id/stream", async (req, res) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }

  if (!video.filename) {
    return res.status(400).json({ error: "This is a YouTube video, not a local upload" });
  }

  const filePath = path.join(uploadDirectory, path.basename(video.filename));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Video file not found" });
  }

  const fileSize = fs.statSync(filePath).size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4"
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  const [startText, endText] = range.replace(/bytes=/, "").split("-");
  const start = Number.parseInt(startText, 10);
  const end = endText ? Number.parseInt(endText, 10) : fileSize - 1;

  if (start >= fileSize || end >= fileSize || start > end) {
    res.status(416).set("Content-Range", `bytes */${fileSize}`);
    return res.end();
  }

  const chunkSize = end - start + 1;
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4"
  });

  return fs.createReadStream(filePath, { start, end }).pipe(res);
});

module.exports = router;
