const router = require("express").Router();
const Video = require("../models/Video");

router.get("/", async (req, res) => {
  const videos = await Video.find().sort({ createdAt: -1 });
  res.json(videos);
});

router.post("/", async (req, res) => {
  const video = await Video.create(req.body);
  res.json(video);
});

module.exports = router;