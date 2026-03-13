const mongoose = require('mongoose');

const AnswerOptionSchema = new mongoose.Schema({
  optionText: String,
  isCorrect: Boolean,
  orderIndex: Number
});

const QuestionSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true
    },

    questionText: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ['single', 'multiple', 'text', 'number'],
      required: true,
      default: 'single'
    },

    orderIndex: Number,

    // For single / multiple
    options: [AnswerOptionSchema],

    // For text / number
    correctAnswerText: {
      type: String,
      default: null
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('Question', QuestionSchema);
