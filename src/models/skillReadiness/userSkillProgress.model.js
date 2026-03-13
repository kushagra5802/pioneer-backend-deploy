// models/UserSkillProgress.js
const mongoose = require('mongoose');

const UserSkillProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true
    },
    completedWeeks: {
      type: [Number],
      default: []
    },
    currentWeek: Number,
    isCompleted: { type: Boolean, default: false },
    completionDate: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'UserSkillProgress',
  UserSkillProgressSchema
);
