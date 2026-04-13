const { Forbidden, NotFound } = require("http-errors");
const StudentExperienceContent = require("../models/studentExperience.model");
const { uploadToS3 } = require("../utils/uploadToS3");
const { deleteFromS3 } = require("../utils/deleteFromS3");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const ADMIN_ROLES = ["admin", "superadmin"];

const parseArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const parseMediaField = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

class StudentExperienceService {
  static async appendSignedUrls(records = []) {
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.ACCESS_SECRET,
      },
      region: process.env.REGION,
    });

    const normalizedRecords = Array.isArray(records) ? records : [records];

    for (const record of normalizedRecords) {
      if (!record?.mediaFiles?.length) continue;

      for (const file of record.mediaFiles) {
        if (!file?.key) continue;

        try {
          const command = new GetObjectCommand({
            Bucket: process.env.BUCKET,
            Key: file.key,
          });

          file.publicUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 1800,
          });
        } catch (error) {
          console.error(
            "Error generating signed URL for student experience media:",
            error.message
          );
        }
      }
    }

    return Array.isArray(records) ? normalizedRecords : normalizedRecords[0];
  }

  static async mediaUpload(payload) {
    try {
      const { user } = payload.authData;

      if (!ADMIN_ROLES.includes(user.role)) {
        throw Forbidden("You are not allowed to upload resource media");
      }

      if (!payload.files?.length) {
        throw Forbidden("Please upload at least one file");
      }

      const files = await uploadToS3({
        files: payload.files,
        userId: user._id,
        folder: "studentExperience/resources",
      });

      return {
        status: true,
        data: files.map((file, index) => ({
          ...file,
          guid: file.guid || `${Date.now()}-${index}`,
          mimetype:
            payload.files[index]?.mimetype || file.mimetype || "application/octet-stream",
        })),
        message: "Files uploaded successfully",
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
        subtitle,
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
        mediaFiles,
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
        subtitle,
        description,
        categoryLabel,
        actionLabel,
        actionLink,
        dateLabel,
        locationLabel,
        cityName,
        distanceLabel,
        mediaFiles: parseMediaField(mediaFiles),
        gradeCategories: parseArrayField(gradeCategories),
        interestTags: parseArrayField(interestTags),
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

      const content = await StudentExperienceContent.find(query).lean().sort({
        displayOrder: 1,
        createdAt: -1,
      });

      const contentWithSignedUrls = await this.appendSignedUrls(content);

      return {
        status: true,
        data: contentWithSignedUrls,
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

      const existingContent = await StudentExperienceContent.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!existingContent) {
        throw NotFound("Student experience content not found");
      }

      const nextMediaFiles = payload.body.mediaFiles
        ? parseMediaField(payload.body.mediaFiles)
        : existingContent.mediaFiles || [];

      const removedMediaKeys = (existingContent.mediaFiles || [])
        .filter(
          (file) => file?.key && !nextMediaFiles.some((item) => item?.key === file.key)
        )
        .map((file) => file.key);

      const content = await StudentExperienceContent.findOneAndUpdate(
        { _id: id, isDeleted: false },
        {
          ...payload.body,
          subtitle: payload.body.subtitle ?? existingContent.subtitle,
          mediaFiles: nextMediaFiles,
          gradeCategories: payload.body.gradeCategories
            ? parseArrayField(payload.body.gradeCategories)
            : existingContent.gradeCategories,
          interestTags: payload.body.interestTags
            ? parseArrayField(payload.body.interestTags)
            : existingContent.interestTags,
          updatedBy: user._id,
        },
        { new: true }
      );

      for (const key of removedMediaKeys) {
        await deleteFromS3(key);
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

      const existingContent = await StudentExperienceContent.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!existingContent) {
        throw NotFound("Student experience content not found");
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

      for (const file of existingContent.mediaFiles || []) {
        if (file?.key) {
          await deleteFromS3(file.key);
        }
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
