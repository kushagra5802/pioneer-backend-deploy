const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String }
  },
  { _id: false }
);

const BlogSchema = new mongoose.Schema(
  {
    // Reference to Student
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    // Blog Title
    title: {
      type: String,
      required: true,
      trim: true
    },

    // Blog Description / Content
    description: {
      type: String,
      required: true
    },

    imageUrls: {
      type: [MediaSchema],
      default: []
    },

    // Approval status by admin
    isApproved: {
      type: Boolean,
      default: false
    },

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    approvedByName: {
        type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", BlogSchema);