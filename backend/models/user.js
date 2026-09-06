const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  sex: {
    type: String,
    enum: ["male", "female", "other", "prefer_not_to_say"],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);