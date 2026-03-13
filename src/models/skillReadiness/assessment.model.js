// models/Assessment.js
const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema(
  {
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true
    },

    weekId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Week',
      required: false
    },
    title: String,
    type: {
      type: String,
      enum: ['weekly', 'final'],
      default: 'weekly'
    },
    passingScore: {
      type: Number,
      default: 70
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Assessment', AssessmentSchema);
