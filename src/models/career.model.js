// const { default: mongoose } = require("mongoose");

// const CareerSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   industryId: { type: mongoose.Schema.Types.ObjectId, ref: "Industry" },
//   description: String,
//   requiredSubjects: [String], // e.g. Math, Physics
//   skillTags: [String],
//   isActive: { type: Boolean, default: true }
// }, { timestamps: true });

// module.exports = mongoose.model("Career", CareerSchema);


const mongoose = require("mongoose");

const CareerSchema = new mongoose.Schema(
  {
    /* ----------------------------------
       SCHOOL CONTEXT
    -----------------------------------*/
    // schoolId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "School",
    //   required: true,
    //   index: true
    // },

    /* ----------------------------------
       CORE CAREER INFO
    -----------------------------------*/
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    industry: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    progression: {
      type: String,
      required: true,
      trim: true
    },

    /* ----------------------------------
       ARRAYS / DETAILS
    -----------------------------------*/
    keySkills: {
      type: [String],
      default: []
    },

    topInstitutionsIndia: {
      type: [String],
      default: []
    },

    globalPathways: {
      type: [String],
      default: []
    },

    /* ----------------------------------
       META
    -----------------------------------*/
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    isSelected: {
      type: Boolean,
      default: false,
      index: true
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

/* ----------------------------------
   TEXT SEARCH INDEX
-----------------------------------*/
CareerSchema.index({
  title: "text",
  industry: "text",
  description: "text",
  keySkills: "text"
});

/* ----------------------------------
   EXPORT MODEL
-----------------------------------*/
module.exports = mongoose.model("Career", CareerSchema);
