// const mongoose = require("mongoose");

// const UniversitySchema = new mongoose.Schema(
//   {
//     /* -----------------------------
//        CORE INFO
//     ------------------------------*/
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       index: true
//     },

//     city: {
//       type: String,
//       trim: true,
//       index: true
//     },

//     state: {
//       type: String,
//       trim: true,
//       index: true
//     },

//     rankAccreditation: {
//       type: String,
//       trim: true
//     },

//     /* -----------------------------
//        ADMISSION DETAILS
//     ------------------------------*/
//     modeOfEntry: {
//       type: String
//     },

//     acceptanceRate: {
//       type: String
//     },

//     cutOffTrend: {
//       type: String
//     },

//     /* -----------------------------
//        ENTRANCE EXAMS
//     ------------------------------*/
//     entranceExams: {
//       type: [String],
//       default: []
//     },

//     /* -----------------------------
//        WEBSITE
//     ------------------------------*/
//     officialWebsite: {
//       type: String,
//       trim: true
//     },

//     /* -----------------------------
//        META
//     ------------------------------*/
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User"
//     },

//     isDeleted: {
//       type: Boolean,
//       default: false,
//       index: true
//     }

//   },
//   { timestamps: true }
// );

// /* -----------------------------
//    TEXT SEARCH INDEX
// ------------------------------*/
// UniversitySchema.index({
//   name: "text",
//   city: "text",
//   state: "text",
//   rankAccreditation: "text"
// });

// module.exports = mongoose.model("University", UniversitySchema);

const mongoose = require("mongoose");

const UniversitySchema = new mongoose.Schema(
  {
    /* -----------------------------
       CORE INFO
    ------------------------------*/
    name: { type: String, required: true, trim: true, index: true },
    city: { type: String, trim: true, index: true },
    state: { type: String, trim: true, index: true },
    country: { type: String, trim: true },

    rankAccreditation: { type: String, trim: true },

    /* -----------------------------
       DETAILS FROM SHEET
    ------------------------------*/
    type: { type: String }, // Private / Govt
    establishedYear: { type: String },
    coursesOffered: { type: [String], default: [] },
    specializations: { type: [String], default: [] },

    feesRange: { type: String },
    averagePackage: { type: String },
    highestPackage: { type: String },

    facilities: { type: [String], default: [] },

    /* -----------------------------
       ADMISSION DETAILS
    ------------------------------*/
    modeOfEntry: { type: String },
    acceptanceRate: { type: String },
    cutOffTrend: { type: String },

    /* -----------------------------
       ENTRANCE EXAMS
    ------------------------------*/
    entranceExams: { type: [String], default: [] },

    /* -----------------------------
       WEBSITE
    ------------------------------*/
    officialWebsite: { type: String, trim: true },

    /* -----------------------------
       META
    ------------------------------*/
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

/* -----------------------------
   TEXT INDEX
------------------------------*/
UniversitySchema.index({
  name: "text",
  city: "text",
  state: "text",
  rankAccreditation: "text"
});

module.exports = mongoose.model("University", UniversitySchema);
