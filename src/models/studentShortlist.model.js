const mongoose = require("mongoose");

const StudentShortlistSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
      index: true,
    },
    shortlistedCareers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Career",
      },
    ],
    shortlistedUniversities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "University",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentShortlist", StudentShortlistSchema);
