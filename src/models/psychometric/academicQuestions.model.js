const mongoose = require("mongoose");

const AcademicQuestionSchema = new mongoose.Schema(
  {
    _id: {
      type: Number,
    },
    questionText: {
      type: String
    },
    dimension: {
      type: String
    },
    isPositive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademicQuestion", AcademicQuestionSchema);

