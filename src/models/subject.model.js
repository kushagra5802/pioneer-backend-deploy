const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },
    classGrade: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      trim: true
    },
    maxMarks: {
      type: Number,
      default: 100
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

SubjectSchema.index({ schoolId: 1, classGrade: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Subject", SubjectSchema);

