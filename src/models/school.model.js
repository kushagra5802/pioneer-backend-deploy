const { default: mongoose } = require("mongoose");

const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  schoolCode:{ type: String, unique: true,
      index: true },
  board: { type: String, required: true },
  location: {
    state: String,
    city: String
  },
  otpObject: {
        otp: { type: String },
        createdAt: { type: Date }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("School", SchoolSchema);
