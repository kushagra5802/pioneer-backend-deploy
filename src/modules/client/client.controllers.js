const { validationResult } = require('express-validator');
const EncryptDecrypt = require('../../utils/utils.encryptDecrypt');
const Responses = require("../../utils/utils.response");
const EncryptAndDecrypt = require("../../utils/utils.encryptAndDecrypt");
const clientService = require("../client/client.service");
const bcrypt = require("bcrypt");
const ClientUser = require("../client/clientUser.model");
const DateFormatter = require('../../utils/utils.dateFormatter');
const AwsClient = require("../../config/awsconfig");
const AWS3 = require("@aws-sdk/client-s3");
const { getSignedUrl, getSignedUrlPromise } = require("@aws-sdk/s3-request-presigner");
const path = require('path');
const { v4: uuid } = require('uuid');
const { Upload } = require("@aws-sdk/lib-storage");

class ClientController {

    static async clientCreate(req, res) {
        try {
            const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
            // const salt =  bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
            // console.log("salt >>>>>>>>",salt);
            const saltRounds = parseInt(process.env.BCRYPT_SALT);
            const hash = await bcrypt.hash(req.body.password, saltRounds);
            req.body.password = hash;
            req.body.clientPassword = encryptedPassword;
            const result = await clientService.createClient(req);
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

    static async clientOfficeCreate(req, res) {
        try {
            const id = req?.authData?.user?.organisationId;
            // Validate incoming input
            // const errors = validationResult(req);
            // if (!errors.isEmpty()) {
            //     return res.status(400).json(Responses.errorResponse(errors))
            // }

            const result = await clientService.clientOfficeCreate(req.body, id);
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
            res.status(400).json(Responses.errorResponse(error))
        }
    }


    static async clientEmailPhoneLogin(req, res) {
        try {
            const result = await clientService.loginEmailOrPhone(req);
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

    static async clientPhoneSendUserLogin(req, res) {
        try {
            const result = await clientService.loginPhoneSendOtp(req);
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

    static async clientPhoneVerifyUserLogin(req, res) {
        try {
            const result = await clientService.loginPhoneVerifyOtp(req);
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

    //search clientUser with keyword
    static async searchClientUserWithKeyword(req, res) {
        try {
            const result = await clientService.searchClientUserWithKeyword(req);
            const { status, data, currentPage, totalPages, message, error } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages });

        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    //filter by query string
    static async getFilteredClientUser(req, res) {
        try {
            const result = await clientService.getFilteredClientUser(req, req.query.field);
            const { status, data, currentPage, totalPages, message, totalclients, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalclients": totalclients, "previousPage": previousPage, "nextPage": nextPage });

        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    //GET ClientUsers with pagination
    static async clientUsersGetPaginate(req, res) {
        try {
            const result = await clientService.clientUserGetPagination(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }
    //GET ClientOffice with pagination
    static async ClientOfficeGetPaginate(req, res) {
        try {
            let result = await clientService.clientOfficeGetPagination(req);
            if (result) {
                res.status(201).json(result);
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    //fetch single office summary by Id
    static async officeSummary(req, res) {
        try {
            const result = await clientService.officeSummary(req, res);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    //search office with keyword
    static async searchOfficeWithKeyword(req, res) {
        try {
            const id = req?.authData?.user?._id;
            const result = await clientService.searchOfficeWithKeyword(req, id);
            const { status, data, currentPage, totalPages, message, totalOffices, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalOffices": totalOffices, "previousPage": previousPage, "nextPage": nextPage });
        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    static async getAllClientAdminByType(req, res) {
        try {
            const result = await clientService.getAllClientAdminByType(req);
            const { status, data, currentPage, totalPages, message, totalclients, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalclients": totalclients, "previousPage": previousPage, "nextPage": nextPage });

        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    //fetch clientuser by Id
    static async clientUserGetById(req, res) {
        try {
            const result = await clientService.getOneclientUser(req, res);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async clientUserUpdate(req, res) {
        try {
            // Validate incoming input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json(Responses.errorResponse(errors))
            }

            // req.body.password = EncryptDecrypt.crypt(req.body.password);
            if(req.body.password){
                const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
                const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
                const hash = bcrypt.hashSync(req.body.password, salt);
                req.body.password = hash;
                req.body.clientPassword = encryptedPassword;
            }
            const result = await clientService.clientUserUpdateService(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async clientUserDelete(req, res) {
        try {
            const result = await clientService.clientUserDeleteService(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // searchClientWithKeyword
    static async searchClientWithKeyword(req, res) {
        try {

            const result = await clientService.searchClientWithKeyword(req);
            const { status, data, currentPage, totalPages, message, error } = result;

            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages });
        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    static async getClientById(req, res) {
        try {
            const result = await clientService.getClientById(req.params.id);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async clientUpdate(req, res) {
        try {

            // Validate incoming input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json(Responses.errorResponse(errors))
            }
            if(req.body.password){
                const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
                const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
                const hash = bcrypt.hashSync(req.body.password, salt);
                req.body.password = hash;
                req.body.clientPassword = encryptedPassword;
            }

            const result = await clientService.clientUpdate(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async getClientUserInfoById(req, res) {
        try {
            const result = await clientService.getClientUserInfoById(req.params.id);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async updateClientUserInfoById(req, res) {
        try {

            if(req.body.password){
                const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
                const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
                const hash = bcrypt.hashSync(req.body.password, salt);
                req.body.password = hash;
                req.body.clientPassword = encryptedPassword;
            }

            const result = await clientService.updateClientUserInfoById(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // getclientroles
    static async getclientroles(req, res) {
        try {
            const result = await clientService.getclientroles(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // updateClientProfile
    static async updateClientProfile(req, res) {
        try {

            let getClient = await ClientUser.findById({ _id: req.params.id })
            if (getClient == "null") {
                throw Unauthorized("Client does not exist");
            }
            if (req.file == undefined) {
                return res.status(400).json(Responses.successResponse({ message: "Please upload a file!" }));
            }

            let filename = `staging/clients/${DateFormatter.getMonth(new Date())}/${req.authData.user._id}/${path.parse(req.file.originalname).name + uuid()}.${req.file.originalname.split('.').pop()}`;

            let startIndex = (filename.indexOf('\\') >= 0 ? filename.lastIndexOf('\\') : filename.lastIndexOf('/'));
            let getFileName = filename.substring(startIndex);
            if (getFileName.indexOf('\\') === 0 || getFileName.indexOf('/') === 0) {
                getFileName = getFileName.substring(1);
            }
            let params = { 
                Key: filename, 
                Bucket: process.env.BUCKET, 
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            };

            const command = new AWS3.GetObjectCommand(params);
            const fileURL = await getSignedUrl(AwsClient.s3Instance, command, { expiresIn: 3600 })

            const parallelUploads3 = new Upload({
                client: AwsClient.s3Instance,
                params: params,
            });

            const response = await parallelUploads3.done();

            if (response.$metadata.httpStatusCode === 200) {

                req.body.profileImageLink = { name: getFileName, key: response.Key, publicUrl: fileURL };

                const result = await clientService.updateClientProfile(req);
                const {
                    status, error, message, data
                } = result;
                if (status) {
                    res.status(201).json(Responses.successResponse(message, data));
                } else {
                    res.status(error.status || 500).json(Responses.errorResponse(error));
                }
            } else {
                throw Unauthorized("File uploading failed");
            }
        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async deleteClientProfile(req, res) {
    try {
        const clientId = req.params.id;

        const client = await ClientUser.findById(clientId);
        if (!client) {
            throw Unauthorized("Client does not exist");
        }

        const profileImageLink = client.profileImageLink;
        if (!profileImageLink || !profileImageLink.key) {
            return res.status(400).json(Responses.successResponse({ message: "No profile image to delete" }));
        }

        // Delete from S3
        const params = {
            Bucket: process.env.BUCKET,
            Key: profileImageLink.key,
        };

        const command = new AWS3.DeleteObjectCommand(params);
        await AwsClient.s3Instance.send(command);

        // Update DB via service
        const result = await clientService.deleteClientProfile(req);
        const { status, error, message, data } = result;

        if (status) {
            res.status(200).json(Responses.successResponse(message, data));
        } else {
            res.status(error.status || 500).json(Responses.errorResponse(error));
        }

    } catch (error) {
        console.error("Error deleting profile image:", error);
        res.status(400).json(Responses.errorResponse(error));
    }
}


    // SearchClientAdminByKeyword
    static async SearchClientAdminByKeyword(req, res) {
        try {
            const result = await clientService.SearchClientAdminByKeyword(req);
            const { status, data, currentPage, totalPages, message, totalclients, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalclients": totalclients, "previousPage": previousPage, "nextPage": nextPage });
        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    // getAllClientAdmin
    static async getAllClientAdmin(req, res) {
        try {
            const result = await clientService.getAllClientAdmin(req);
            const { status, data, currentPage, totalPages, message, totalclients, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalclients": totalclients, "previousPage": previousPage, "nextPage": nextPage });

        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }


    static async getAllClients(req, res) {
        try {
            const result = await clientService.getAllClients(req);
            const { status, data, currentPage, totalPages, message, totalclients, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalclients": totalclients, "previousPage": previousPage, "nextPage": nextPage });

        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    // getClientProfileImage
    static async getClientProfileImage(req, res) {
        try {
            const result = await clientService.getClientProfileImage(req, res);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // organizationalHierarchy
    static async organizationalHierarchy(req, res) {
        try {
            const result = await clientService.organizationalHierarchy(req, res);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }
    
    // organizationalUsersList
    static async organizationalUsersList(req, res) {
        try {
            const result = await clientService.organizationalUsersList(req, res);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // getTokenForCarder
    static async getTokenForCarder(req, res) {
        try {
            const result = await clientService.getTokenForCarder(req);
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


    static async updateClientOfficeById(req, res) {
        try {

            const result = await clientService.updateClientOfficeById(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async deleteClientOfficeById(req, res) {
        try {
            const result = await clientService.deleteClientOfficeById(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // getAllDeactivateClientAdmin
    static async getAllDeactivateClientAdmin(req, res) {
        try {
            const result = await clientService.getAllDeactivateClientAdmin(req);
            const { status, data, currentPage, totalPages, message, totalclients, error, previousPage, nextPage } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "totalclients": totalclients, "previousPage": previousPage, "nextPage": nextPage });

        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    //gets called when requesting to reset password
    static async resetPasswordRequestController(req, res) {
        try {
            //passing email to find user
            const requestPasswordResetService = await clientService.requestPasswordReset(
                req.body.email
            );

            const {
                status, error, message, data
            } = requestPasswordResetService;
            if (status) {
                res.status(200).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    };

    //when link gets click in mail this controller get called
    static async resetPasswordController(req, res) {
        try {
            const resetPasswordService = await clientService.resetPassword(req);
            //resolving the promise from resetpassword
            const {
                status, error, message, data
            } = resetPasswordService;
            if (status) {
                res.status(200).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            console.log(error);
            res.status(400).json(Responses.errorResponse(error));
        }

    };

    static async deleteProfileImageController(req, res) {
        try {
            const deleteProfileImageService = await clientService.deleteProfileImage(req);
            const {
                status, error, message, data
            } = deleteProfileImageService;
            if (status) {
                res.status(200).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            console.log(error);
            res.status(400).json(Responses.errorResponse(error));
        }
    }
}

module.exports = ClientController;
