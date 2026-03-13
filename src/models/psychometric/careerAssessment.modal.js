const mongoose = require("mongoose");

const CareerAssessmentSchema = new mongoose.Schema(
{
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  responses: [
    {
      questionId: {
        type: Number,
        required: true
      },

      selectedOption: {
        type: String,
        enum: ["A", "D"],   // Agree / Disagree
        required: true
      },

      calculatedScore: {
        type: Number,       // 0 or 1
        required: true
      }
    }
  ],

  attemptNumber: {
    type: Number,
    default: 1
  },

  totalScore: {
    type: Number,
    required: true
  },

  percentage: {
    type: Number,
    required: true
  },

  level: {
    type: String,
    enum: ["Low", "Moderate", "High"]
  },

  dimensions: [
    {
      name: {
        type: String,
        enum: [
          "careerConcern",
          "careerCuriosity",
          "careerConfidence",
          "careerConsultation"
        ]
      },

      score: Number,

      maxScore: Number,

      percentage: Number,

      level: {
        type: String,
        enum: ["Low", "Moderate", "High"]
      }
    }
  ],

  completionTimeSeconds: Number,

  submittedAt: {
    type: Date,
    default: Date.now
  }

},
{ timestamps: true }
);

module.exports = mongoose.model(
  "CareerAssessment",
  CareerAssessmentSchema
);