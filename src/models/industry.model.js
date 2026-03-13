const { default: mongoose } = require("mongoose");

const IndustrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
}, { timestamps: true });

module.exports = mongoose.model("Industry", IndustrySchema);