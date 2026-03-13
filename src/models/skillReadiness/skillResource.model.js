const mongoose = require('mongoose');

const SkillResourceSchema = new mongoose.Schema(
  {
    weekId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Week',
      required: true
    },
    title: String,
    url: String,
    resourceType: {
      type: String,
      enum: ['article', 'pdf', 'video', 'document']
    },
    orderIndex: Number
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('SkillResource', SkillResourceSchema);
