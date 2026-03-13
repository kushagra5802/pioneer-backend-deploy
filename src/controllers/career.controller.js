const Responses = require("../utils/utils.response");
const CareerService = require("../services/career.service")

class CareerController {

    static async createCareer(req, res) {
        try {
            const result = await CareerService.createCareer(req);
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
    static async getCareer(req, res) {
        try {
            const result = await CareerService.getCareer(req);
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

module.exports = CareerController;
