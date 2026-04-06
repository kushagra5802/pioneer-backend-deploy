const { Forbidden, NotFound } = require("http-errors");
const StudentExperienceContent = require("../models/studentExperience.model");

const ADMIN_ROLES = ["admin", "superadmin"];

class StudentExperienceService {
  static async createContent(payload) {
    try {
      const { user } = payload.authData;

      if (!ADMIN_ROLES.includes(user.role)) {
        throw Forbidden("You are not allowed to create student experience content");
      }

      const {
        contentScope,
        contentType,
        title,
        description,
        categoryLabel,
        actionLabel,
        actionLink,
        dateLabel,
        locationLabel,
        cityName,
        distanceLabel,
        gradeCategories,
        interestTags,
        displayOrder,
        isActive = true,
      } = payload.body;

      if (!contentScope) throw Forbidden("Content scope is required");
      if (!contentType) throw Forbidden("Content type is required");
      if (!title) throw Forbidden("Title is required");

      const content = await StudentExperienceContent.create({
        contentScope,
        contentType,
        title,
        description,
        categoryLabel,
        actionLabel,
        actionLink,
        dateLabel,
        locationLabel,
        cityName,
        distanceLabel,
        gradeCategories: Array.isArray(gradeCategories) ? gradeCategories : [],
        interestTags: Array.isArray(interestTags) ? interestTags : [],
        displayOrder: Number(displayOrder) || 1,
        isActive,
        createdBy: user._id,
      });

      return {
        status: true,
        data: content,
        message: "Student experience content created successfully",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }

  static async getContent(payload) {
    try {
      const {
        contentScope,
        contentType,
        grade,
        interest,
        cityName,
        activeOnly,
        keyword,
      } = payload.query;

      const query = { isDeleted: false };

      if (contentScope) query.contentScope = contentScope;
      if (contentType) query.contentType = contentType;
      if (cityName) query.cityName = cityName;
      if (activeOnly === "true") query.isActive = true;
      if (grade) {
        query.$or = [
          { gradeCategories: { $size: 0 } },
          { gradeCategories: { $in: [String(grade)] } },
        ];
      }
      if (interest) {
        const interests = String(interest)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        if (interests.length) {
          query.$and = [
            ...(query.$and || []),
            {
              $or: [
                { interestTags: { $size: 0 } },
                { interestTags: { $in: interests } },
              ],
            },
          ];
        }
      }
      if (keyword) {
        query.$and = [
          ...(query.$and || []),
          {
            $or: [
              { title: { $regex: keyword, $options: "i" } },
              { description: { $regex: keyword, $options: "i" } },
              { categoryLabel: { $regex: keyword, $options: "i" } },
              { locationLabel: { $regex: keyword, $options: "i" } },
            ],
          },
        ];
      }

      const content = await StudentExperienceContent.find(query).sort({
        displayOrder: 1,
        createdAt: -1,
      });

      return {
        status: true,
        data: content,
        message: "Student experience content fetched successfully",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }

  static async updateContent(payload) {
    try {
      const { user } = payload.authData;
      const { id } = payload.params;

      if (!ADMIN_ROLES.includes(user.role)) {
        throw Forbidden("You are not allowed to update student experience content");
      }

      const content = await StudentExperienceContent.findOneAndUpdate(
        { _id: id, isDeleted: false },
        {
          ...payload.body,
          updatedBy: user._id,
        },
        { new: true }
      );

      if (!content) {
        throw NotFound("Student experience content not found");
      }

      return {
        status: true,
        data: content,
        message: "Student experience content updated successfully",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }

  static async deleteContent(payload) {
    try {
      const { user } = payload.authData;
      const { id } = payload.params;

      if (!ADMIN_ROLES.includes(user.role)) {
        throw Forbidden("You are not allowed to delete student experience content");
      }

      const content = await StudentExperienceContent.findOneAndUpdate(
        { _id: id, isDeleted: false },
        {
          isDeleted: true,
          isActive: false,
          updatedBy: user._id,
        },
        { new: true }
      );

      if (!content) {
        throw NotFound("Student experience content not found");
      }

      return {
        status: true,
        data: content,
        message: "Student experience content deleted successfully",
        error: null,
      };
    } catch (error) {
      return {
        status: false,
        data: null,
        message: error.message,
        error,
      };
    }
  }
}

module.exports = StudentExperienceService;
