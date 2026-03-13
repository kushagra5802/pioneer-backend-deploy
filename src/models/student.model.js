const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    // Custom Student ID
    studentId: {
      type: String,
      unique: true,
      index: true
    },

    // Reference to School
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },
    studentPassword: {type: String},
    // Basic Information
    personalInfo: {
      fullName: { type: String, required: true },
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: "Male"
      }
    },

    // Academic Info
    academicInfo: {
      classGrade: { type: String, required: true },
      section: String,
      rollNumber: String
    },

    // Address Information
    addressInfo: {
      state: String,
      city: String,
      address: String
    },

    // Contact Information
    contactInfo: {
      mobileNumber: String,
      studentEmail: String
    },

    // Parent / Guardian Information
    familyInfo: {
      fatherName: String,
      motherName: String,
      guardianName: String,
      parentMobile: String,
      parentEmail: String,
      parentOccupation: String
    },

    // Exam Results
    examResults: [
      {
        examType: {
          type: String,
          enum: ["UNIT_TEST", "MIDTERM", "FINAL"],
          required: true
        },
        academicYear: {
          type: String, 
          required: true
        },
        totalMarks: {
          type: Number,
          required: true
        },
        maxTotalMarks: {
          type: Number,
          required: true
        },
        percentage: {
          type: Number
        },
        resultStatus: {
          type: String,
          enum: ["PASS", "FAIL"],
          required: true
        }
      }
    ],

    otpObject: {
      otp: { type: String },
      createdAt: { type: Date }
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolUser"
    }

    // // Academic Records
    // academics: [
    //   {
    //     subject: String,
    //     marks: Number,
    //     percentile: Number
    //   }
    // ],

    // // Psychometric Tests
    // psychometric: {
    //   careerTest: {
    //     scores: mongoose.Schema.Types.Mixed,
    //     normalizedScore: Number
    //   },
    //   mentalHealthTest: {
    //     scores: mongoose.Schema.Types.Mixed,
    //     recommendation: String
    //   }
    // },

    // // Career Recommendations
    // recommendedCareers: [
    //   {
    //     careerName: String,
    //     confidence: Number
    //   }
    // ],

    // selectedCareers: [String],

    // // Skills & Certifications
    // skills: [
    //   {
    //     skillName: String,
    //     completedAt: Date,
    //     certificateUrl: String
    //   }
    // ],

    // // Counselling & Seminars
    // counselling: [
    //   {
    //     type: {
    //       type: String,
    //       enum: ["ONE_TO_ONE", "SEMINAR"]
    //     },
    //     scheduledAt: Date,
    //     paymentStatus: {
    //       type: String,
    //       enum: ["PENDING", "PAID", "FAILED"],
    //       default: "PENDING"
    //     }
    //   }
    // ],

    // // Resume Snapshot
    // resume: {
    //   lastGeneratedAt: Date,
    //   pdfUrl: String
    // }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);
