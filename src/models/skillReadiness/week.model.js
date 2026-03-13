const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String }
  },
  { _id: false }
);

const WeekSchema = new mongoose.Schema(
  {
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true
    },
    weekNumber: {
      type: Number,
      min: 1,
      max: 4,
      required: true
    },
    title: String,
    content: String, 
    description: String,
    
    imageUrls: {
      type: [MediaSchema],
      default: []
    },

    videoUrls: {
      type: [MediaSchema],
      default: []
    },
    isActive: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Week', WeekSchema);