const mongoose = require("mongoose");

const StudentExperienceContentSchema = new mongoose.Schema(
  {
    contentScope: {
      type: String,
      enum: ["WELCOME", "DASHBOARD", "RESOURCES", "EXPLORE_CITY"],
      required: true,
      index: true,
      trim: true,
    },
    contentType: {
      type: String,
      enum: [
        "TARGET_EXAM",
        "UPCOMING_EVENT",
        "NEXT_STEP",
        "CONTINUE_ACTIVITY",
        "RESOURCE",
        "NEARBY_EVENT",
        "INSTITUTION",
        "COMPETITION",
      ],
      required: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    categoryLabel: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    actionLabel: {
      type: String,
      default: "",
      trim: true,
    },
    actionLink: {
      type: String,
      default: "",
      trim: true,
    },
    dateLabel: {
      type: String,
      default: "",
      trim: true,
    },
    locationLabel: {
      type: String,
      default: "",
      trim: true,
    },
    cityName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    distanceLabel: {
      type: String,
      default: "",
      trim: true,
    },
    gradeCategories: {
      type: [String],
      default: [],
      index: true,
    },
    interestTags: {
      type: [String],
      default: [],
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 1,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

StudentExperienceContentSchema.index({
  title: "text",
  description: "text",
  categoryLabel: "text",
  locationLabel: "text",
  cityName: "text",
});

module.exports = mongoose.model(
  "StudentExperienceContent",
  StudentExperienceContentSchema
);
