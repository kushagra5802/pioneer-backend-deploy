// models/Skill.js
const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    month: { type: String },
    year: { type: Number },
    isActive: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Skill', SkillSchema);
