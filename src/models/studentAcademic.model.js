const mongoose = require("mongoose");

const StudentAcademicRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      ref: "Student",
      required: true
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    },

    academicYear: {
      type: String,
      required: true
    },
    classGrade: {
      type: String,
      required: true
    },
    section: {
      type: String
    },

    exam: {
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ["UNIT_TEST", "MIDTERM", "FINAL"],
        required: true
      }
    },

    subjects: [
      {
        academicYear:String,
        subjectName: String,
        maxMarks: Number,
        marksObtained: Number
      }
    ],

    totalMarks: Number,
    maxTotalMarks: Number,
    percentage: Number,
    resultStatus: {
      type: String,
      enum: ["PASS", "FAIL"]
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolUser"
    }
  },
  { timestamps: true }
);

StudentAcademicRecordSchema.index(
  { studentId: 1, academicYear: 1, "exam.type": 1 },
  { unique: true }
);

module.exports = mongoose.model("StudentAcademicRecord", StudentAcademicRecordSchema);

