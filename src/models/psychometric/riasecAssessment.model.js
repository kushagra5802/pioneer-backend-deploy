const mongoose = require("mongoose");

const RiasecAssessmentSchema = new mongoose.Schema(
{
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
  },

  responses: [
    {
      questionId: Number,
      selectedOption: String, // A or D
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

  dimensionScores: {
    R: Number,
    I: Number,
    A: Number,
    S: Number,
    E: Number,
    C: Number
  },

  interestCode: String, // top 3 letters

  completionTimeSeconds: Number,

  submittedAt: Date

},
{ timestamps: true }
);

module.exports = mongoose.model(
  "RiasecAssessment",
  RiasecAssessmentSchema
);