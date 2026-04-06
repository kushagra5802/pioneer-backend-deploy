const Responses = require("../utils/utils.response");
const StudentShortlistService = require("../services/studentShortlist.service");

class StudentShortlistController {
  static async getShortlist(req, res) {
    try {
      const result = await StudentShortlistService.getShortlist(req);
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

  static async toggleCareerShortlist(req, res) {
    try {
      const result = await StudentShortlistService.toggleCareerShortlist(req);
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

  static async toggleUniversityShortlist(req, res) {
    try {
      const result =
        await StudentShortlistService.toggleUniversityShortlist(req);
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

module.exports = StudentShortlistController;
