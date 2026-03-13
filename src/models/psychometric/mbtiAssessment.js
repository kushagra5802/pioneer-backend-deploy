const mongoose = require("mongoose");

const MBTIAssessmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    /* ==========================
       RAW RESPONSES (70)
    ========================== */
    responses: [
      {
        questionId: {
          type: Number,
          required: true
        },
        response: {
          type: String,
          enum: ["A", "B"],
          required: true
        },
        column: {
          type: Number,
          min: 1,
          max: 4
        }
      }
    ],

    /* ==========================
       ATTEMPT TRACKING
    ========================== */
    attemptNumber: {
      type: Number,
      default: 1
    },

    /* ==========================
       SCORE BREAKDOWN
    ========================== */
    scores: {
      E: { type: Number, default: 0 },
      I: { type: Number, default: 0 },
      S: { type: Number, default: 0 },
      N: { type: Number, default: 0 },
      T: { type: Number, default: 0 },
      F: { type: Number, default: 0 },
      J: { type: Number, default: 0 },
      P: { type: Number, default: 0 }
    },

    /* ==========================
       PERCENTAGE WEIGHTAGE
    ========================== */
    percentages: {
      EI: Number,
      SN: Number,
      TF: Number,
      JP: Number
    },

    /* ==========================
       CONFIDENCE LEVELS
       Strong (≥60%)
       Moderate (50–59%)
       Balanced (50–50)
    ========================== */
    confidence: {
      EI: String,
      SN: String,
      TF: String,
      JP: String
    },

    /* ==========================
       FINAL RESULT
    ========================== */
    mbti_type: {
      type: String,
      enum: [
        "ISTJ","ISFJ","INFJ","INTJ",
        "ISTP","ISFP","INFP","INTP",
        "ESTP","ESFP","ENFP","ENTP",
        "ESTJ","ESFJ","ENFJ","ENTJ"
      ]
    },

    /* ==========================
       RESULT LIBRARY CONTENT
       (Snapshot pulled dynamically
       from 16-type reference)
    ========================== */
    personalitySnapshot: String,
    strengths: [String],
    growthAreas: [String],
    workStyle: String,
    recommendations: [String],

    /* ==========================
       META
    ========================== */
    completionTimeSeconds: Number,
    submittedAt: {
      type: Date,
      default: Date.now
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("MBTIAssessment", MBTIAssessmentSchema);