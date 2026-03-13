const mongoose = require("mongoose");

const AcademicAssessmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
  },

  responses: [
    {
      questionId: Number,
      selectedOption: Number,
      calculatedScore: Number
    }
  ],
  attemptNumber: {
      type: Number,
      default: 1
    },

  totalScore: Number,
  percentage: Number,
  level: String,

  dimensions: [
    {
      name: String,
      score: Number,
      maxScore: Number,
      percentage: Number,
      level: String
    }
  ],

  completionTimeSeconds: Number
}, { timestamps: true });

module.exports = mongoose.model("AcademicAssessment", AcademicAssessmentSchema);