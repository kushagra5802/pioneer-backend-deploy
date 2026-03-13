const Responses = require("../utils/utils.response");
const EncryptAndDecrypt = require("../utils/utils.encryptAndDecrypt");
const bcrypt = require("bcrypt");
const AwsClient = require("../config/awsconfig");
const AWS3 = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require('path');
const { v4: uuid } = require('uuid');
const { Upload } = require("@aws-sdk/lib-storage");
const StudentService = require("../services/student.service");
const { validationResult } = require("express-validator");

const FIXED_COLUMNS = [
  "Student ID",
  "Academic Year",
  "Class",
  "Section",
  "Exam"
];

class StudentController {

    // static async studentCreate(req, res) {
    //     try {
    //         const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
    //         const saltRounds = parseInt(process.env.BCRYPT_SALT);
    //         const hash = await bcrypt.hash(req.body.password, saltRounds);
    //         req.body.password = hash;
    //         req.body.clientPassword = encryptedPassword;
    //         const result = await StudentService.createStudent(req);
    //         const {
    //             status, error, message, data
    //         } = result;
    //         if (status) {
    //             res.status(201).json(Responses.successResponse(message, data));
    //         } else {
    //             res.status(error.status || 500).json(Responses.errorResponse(error));
    //         }
    //     }
    //     catch (error) {
    //         console.log(error);
    //         res.status(400).json(Responses.errorResponse(error))
    //     }
    // }

    static async studentEmailPhoneLogin(req, res) {
        try {
            const result = await StudentService.loginEmailOrPhone(req);
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

    static async studentCreate(req, res) {
        try {
            const result = await StudentService.createStudent(req);
            const { status, error, message, data } = result;

            if (status) {
            res.status(201).json(Responses.successResponse(message, data));
            } else {
            res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    static async uploadStudentsSheet(req, res) {
        try {
            console.log("HERE UPLOAD")
            if (!req.file) {
            return res
                .status(400)
                .json(
                Responses.errorResponse(new Error("Please upload a file"))
                );
            }

            const result = await StudentService.uploadStudentsSheet(req);
            const { status, error, message, data } = result;

            if (status) {
            return res
                .status(201)
                .json(Responses.successResponse(message, data));
            }

            return res
            .status(error?.status || 400)
            .json(Responses.errorResponse(error));

        } catch (error) {
            console.error(error);
            return res
            .status(400)
            .json(Responses.errorResponse(error));
        }
    }

    static async getStudents(req, res) {
        try {
            const result = await StudentService.getStudents(req);
            const {status, error, message, data,total, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data,"total":total, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async getStudentDetails(req, res) {
        try {
            const result = await StudentService.getStudentDetails(req);
            const {status, error, message, data
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

     static async getStudentById(req, res) {
        try {
            const result = await StudentService.getStudentById(req);
            const {status, error, message, data, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

     static async deleteStudent(req, res) {
        try {
            const result = await StudentService.deleteStudent(req);
            const {status, error, message, data, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async updateStudent(req, res) {
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

            const result = await StudentService.updateStudent(req);

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

    static async uploadMarksSheet(req, res) {
        try {
        if (!req.file) {
            return res
            .status(400)
            .json(
                Responses.errorResponse(new Error("Please upload a marks file"))
            );
        }

        const result = await StudentService.uploadMarks(req);
        const { status, error, message, data } = result;

        if (status) {
            return res
            .status(201)
            .json(Responses.successResponse(message, data));
        }

        return res
            .status(error?.status || 400)
            .json(Responses.errorResponse(error));

        } catch (error) {
        console.error(error);
        return res
            .status(400)
            .json(Responses.errorResponse(error));
        }
    }

    static async getStudentMarks(req, res) {
        try {
            const result = await StudentService.getStudentMarks(req);
            const {status, error, message, data,total, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data,"total":total, "currentpage": currentPage, "totalpages": totalPages});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

}

module.exports = StudentController;
