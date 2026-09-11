const express = require("express");
const VisitorStats = require("../models/visitorStats");

const router = express.Router();
const activeVisitors = new Map();
const visitorTimeout = 60 * 1000;

function removeInactiveVisitors() {
  const cutoff = Date.now() - visitorTimeout;
  for (const [visitorId, lastSeen] of activeVisitors) {
    if (lastSeen < cutoff) activeVisitors.delete(visitorId);
  }
}

const cleanupTimer = setInterval(removeInactiveVisitors, 20 * 1000);
cleanupTimer.unref();

async function statsResponse(res, visitorId, countVisit) {
  if (!visitorId || visitorId.length > 120) {
    return res.status(400).json({ error: "A valid visitor id is required" });
  }

  const isNewVisitor = !activeVisitors.has(visitorId);
  activeVisitors.set(visitorId, Date.now());
  let stats;

  if (countVisit && isNewVisitor) {
    stats = await VisitorStats.findOneAndUpdate(
      { key: "global" },
      { $inc: { totalVisits: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } else {
    stats = await VisitorStats.findOne({ key: "global" }).lean();
  }

  return res.json({
    totalVisitors: stats ? stats.totalVisits : 0,
    liveVisitors: activeVisitors.size
  });
}

router.post("/visit", async (req, res, next) => {
  try {
    return await statsResponse(res, String(req.body.visitorId || "").trim(), true);
  } catch (error) {
    return next(error);
  }
});

router.post("/heartbeat", async (req, res, next) => {
  try {
    return await statsResponse(res, String(req.body.visitorId || "").trim(), false);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
