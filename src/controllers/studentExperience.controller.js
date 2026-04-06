const Responses = require("../utils/utils.response");
const StudentExperienceService = require("../services/studentExperience.service");

class StudentExperienceController {
  static async createContent(req, res) {
    try {
      const result = await StudentExperienceService.createContent(req);
      const { status, error, message, data } = result;

      if (status) {
        res.status(200).json(Responses.successResponse(message, data));
      } else {
        res.status(error.status || 401).json(Responses.errorResponse(error));
      }
    } catch (error) {
      res.status(401).json(Responses.errorResponse(error));
    }
  }

  static async getContent(req, res) {
    try {
      const result = await StudentExperienceService.getContent(req);
      const { status, error, message, data } = result;

      if (status) {
        res.status(200).json(Responses.successResponse(message, data));
      } else {
        res.status(error.status || 401).json(Responses.errorResponse(error));
      }
    } catch (error) {
      res.status(401).json(Responses.errorResponse(error));
    }
  }

  static async updateContent(req, res) {
    try {
      const result = await StudentExperienceService.updateContent(req);
      const { status, error, message, data } = result;

      if (status) {
        res.status(200).json(Responses.successResponse(message, data));
      } else {
        res.status(error.status || 401).json(Responses.errorResponse(error));
      }
    } catch (error) {
      res.status(401).json(Responses.errorResponse(error));
    }
  }

  static async deleteContent(req, res) {
    try {
      const result = await StudentExperienceService.deleteContent(req);
      const { status, error, message, data } = result;

      if (status) {
        res.status(200).json(Responses.successResponse(message, data));
      } else {
        res.status(error.status || 401).json(Responses.errorResponse(error));
      }
    } catch (error) {
      res.status(401).json(Responses.errorResponse(error));
    }
  }
}

module.exports = StudentExperienceController;
