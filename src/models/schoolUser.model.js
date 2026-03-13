const mongoose = require("mongoose");

const SchoolUserSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true
    },

    // Basic Profile
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true
    },

    phone: {
      type: String,
      trim: true
    },

    // Role & Access
    role: {
      type: String,
      enum: [
        "SCHOOL_ADMIN",
        "TEACHER",
        "COUNSELLOR",
        "DATA_OPERATOR"
      ],
      default: "SCHOOL_ADMIN"
    },

    permissions: [
      {
        type: String
        // e.g. "UPLOAD_MARKS", "VIEW_REPORTS"
      }
    ],

    // Auth
    password: {
      type: String,
      required: true,
      select: false
    },

    // Status
    isActive: {
      type: Boolean,
      default: true
    },

    lastLoginAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin" // platform admin
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SchoolUser", SchoolUserSchema);
