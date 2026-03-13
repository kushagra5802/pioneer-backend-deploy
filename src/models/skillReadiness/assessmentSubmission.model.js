const mongoose = require('mongoose');

const SubmittedAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },

  // For single / multiple
  selectedOptionIds: [
    {
      type: mongoose.Schema.Types.ObjectId
    }
  ],

  // For text / number
  writtenAnswer: {
    type: String
  },

  isCorrect: {
    type: Boolean,
    default: false
  },

  scoreAwarded: {
    type: Number,
    default: 0
  }
});

const AssignmentSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true
    },

    answers: [SubmittedAnswerSchema],

    totalQuestions: Number,

    score: {
      type: Number,
      min: 0,
      max: 100
    },

    passed: Boolean,

    status: {
      type: String,
      enum: ['pending', 'completed', 'lateSubmitted', 'evaluated','re-attempt'],
      default: 'pending'
    },

    attemptNumber: {
      type: Number,
      default: 1
    },

    isLate: {
      type: Boolean,
      default: false
    },

    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

AssignmentSubmissionSchema.index(
  { userId: 1, assessmentId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'AssignmentSubmission',
  AssignmentSubmissionSchema
);