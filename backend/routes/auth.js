const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const jwtSecret = () => process.env.JWT_SECRET || "development-secret";

function createToken(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email }, jwtSecret(), { expiresIn: "7d" });
}

function profile(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone || "", dateOfBirth: user.dateOfBirth, sex: user.sex };
}

router.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").replace(/[\s()-]/g, "");
    const dateOfBirth = new Date(req.body.dateOfBirth);
    const sex = String(req.body.sex || "");

    if (!name || !email || password.length < 6 || (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth >= new Date() || !["male", "female", "other", "prefer_not_to_say"].includes(sex)) {
      return res.status(400).json({ error: "Name, email, password, date of birth, and sex are required; mobile must include country code" });
    }

    const existingUser = await User.findOne(phone ? { $or: [{ email }, { phone }] } : { email });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email or mobile already exists" });
    }

    const user = await User.create({ name, email, phone: phone || undefined, dateOfBirth, sex, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ user: profile(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "An account with this email or mobile already exists" });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({ token: createToken(user), user: profile(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user: profile(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const dateOfBirth = new Date(req.body.dateOfBirth);
    const sex = String(req.body.sex || "");
    const phone = String(req.body.phone || "").replace(/[\s()-]/g, "");

    if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth >= new Date() || !["male", "female", "other", "prefer_not_to_say"].includes(sex)) {
      return res.status(400).json({ error: "Valid date of birth and sex are required" });
    }
    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      return res.status(400).json({ error: "Mobile number must include country code" });
    }

    if (phone) {
      const existingUser = await User.findOne({ phone, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(409).json({ error: "This mobile number is already in use" });
      }
    }

    const update = { dateOfBirth, sex };
    if (phone) update.phone = phone;
    else update.$unset = { phone: 1 };
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
    return res.json({ user: profile(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "This mobile number is already in use" });
    return next(error);
  }
});

module.exports = router;
