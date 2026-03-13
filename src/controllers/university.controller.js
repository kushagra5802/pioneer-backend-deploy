const Responses = require("../utils/utils.response");
const UniversityService = require("../services/university.service")

class UniversityController {

    static async createUniversity(req, res) {
        try {
            const result = await UniversityService.createUniversity(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(200).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 401).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            res.status(401).json(Responses.errorResponse(error))
        }
    }
    static async getUniversity(req, res) {
        try {
            const result = await UniversityService.getUniversity(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(200).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 401).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            res.status(401).json(Responses.errorResponse(error))
        }
    }
}

module.exports = UniversityController;
