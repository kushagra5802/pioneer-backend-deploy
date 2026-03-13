const mongoose = require("mongoose");

const RiasecQuestionSchema = new mongoose.Schema(
{
  id: {
    type: Number,
    required: true,
    unique: true
  },

  text: {
    type: String,
    required: true
  },

  dimension: {
    type: String,
    enum: [
      "R", // Realistic
      "I", // Investigative
      "A", // Artistic
      "S", // Social
      "E", // Enterprising
      "C"  // Conventional
    ],
    required: true
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("RiasecQuestion", RiasecQuestionSchema);