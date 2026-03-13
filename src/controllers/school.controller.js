const Responses = require("../utils/utils.response");
const EncryptAndDecrypt = require("../utils/utils.encryptAndDecrypt");
const SchoolService = require("../services/school.service")
const bcrypt = require("bcrypt");
const AwsClient = require("../config/awsconfig");
const AWS3 = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require('path');
const { v4: uuid } = require('uuid');
const { Upload } = require("@aws-sdk/lib-storage");
const SchoolServices = require("../services/school.service");
const { validationResult } = require("express-validator");

class SchoolController {

    static async schoolEmailPhoneLogin(req, res) {
        try {
            const result = await SchoolService.loginEmailOrPhone(req);
            console.log("Controller login info:",result)
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

    static async createSchoolUser(req, res) {
        try {
            const result = await SchoolService.createSchoolUser(req);
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

    static async getSchoolUser(req, res) {
        try {
            const result = await SchoolService.getSchoolUser(req);
            console.log("result",result)
            const {
                status, error, message, data,total
            } = result;
            if (status) {
                res.status(200).json({ "error": error, "status": status, "message": message, "data": data,"total":total});
            } else {
                res.status(error.status || 401).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            res.status(401).json(Responses.errorResponse(error))
        }
    }

    static async schoolCreate(req, res) {
        try {
            const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
            // const salt =  bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
            // console.log("salt >>>>>>>>",salt);
            const saltRounds = parseInt(process.env.BCRYPT_SALT);
            const hash = await bcrypt.hash(req.body.password, saltRounds);
            req.body.password = hash;
            req.body.clientPassword = encryptedPassword;
            const result = await SchoolService.createSchool(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            console.log(error);
            res.status(400).json(Responses.errorResponse(error))
        }
    }

     static async getSchools(req, res) {
        try {
            const result = await SchoolServices.getSchools(req);
            const {status, error, message, data, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

     static async getSchoolById(req, res) {
        try {
            const result = await SchoolServices.getSchoolById(req);
            const {status, error, message, data, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

     static async deleteSchool(req, res) {
        try {
            const result = await SchoolServices.deleteSchool(req);
            const {status, error, message, data, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async updateSchool(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
            return res.status(400).json(Responses.errorResponse(errors));
            }

            if (req.body.password) {
            const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
            const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
            const hash = bcrypt.hashSync(req.body.password, salt);

            req.body.password = hash;
            req.body.clientPassword = encryptedPassword;
            }

            const result = await SchoolServices.updateSchool(req);

            const { status, error, message, data, currentPage, totalPages } = result;
            return res.json({
            error,
            status,
            message,
            data,
            currentpage: currentPage,
            totalpages: totalPages
            });

        } catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
        }

}

module.exports = SchoolController;
