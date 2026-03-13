const mongoose = require("mongoose");

const StudentCounterSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true
  },
  classGrade: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  sequence: {
    type: Number,
    default: 0
  }
});

StudentCounterSchema.index(
  { schoolId: 1, classGrade: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model("StudentCounter", StudentCounterSchema);
