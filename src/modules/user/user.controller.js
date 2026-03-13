const User = require('../user/user.model');
const { validationResult } = require('express-validator');
const Responses = require("../../utils/utils.response");
const UserService = require("../user/user.service");
const AccessToken = require("../../utils/utils.accessToken");
const EncryptDecrypt = require("../../utils/utils.encryptDecrypt");
const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const bcrypt = require("bcrypt");
const AwsClient = require("../../config/awsconfig");
const AWS3 = require("@aws-sdk/client-s3");
const DateFormatter = require('../../utils/utils.dateFormatter');
const path = require("path");
const { getSignedUrl, getSignedUrlPromise } = require("@aws-sdk/s3-request-presigner");
const { roles } = require('../../middleware/roles');
const AccessControl = require("accesscontrol");
const ac = new AccessControl();
const UniqueId = require("../../utils/utils.uniqueId");
const EncryptAndDecrypt = require("../../utils/utils.encryptAndDecrypt");
const { Upload } = require("@aws-sdk/lib-storage");

class UserController {

    static async register(req, res) {
        // try {
        //     // Check if user already exists
        //     const existingUser = await User.findOne({ email: req.body.email });
        //     if (existingUser) {
        //         return res.status(400).json({ message: "Email already in use" });
        //     }

        //     // Hash password
        //     const hashedPassword = await bcrypt.hash(req.body.password, 10);

        //     // Create new user
        //     const newUser = new User({
        //         firstName: req.body.firstName,
        //         lastName: req.body.lastName,
        //         email: req.body.email,
        //         alternativeEmail: req.body.alternativeEmail,
        //         password: hashedPassword,
        //         role: req.body.role,
        //         phone: req.body.phone,
        //         userstatus: req.body.userstatus,
        //         profileImageLink: req.body.profileImageLink,
        //         bio: req.body.bio
        //     });

        //     // Save user to the database
        //     await newUser.save();
        //     let _user = newUser._doc;

        //     // Generate JWT token
        //     const token = AccessToken.generateAccessToken(_user);

        //     // Respond with user data and token
        //     res.status(201).json({
        //         message: "User registered successfully",
        //         user: {
        //             id: newUser._id,
        //             firstName: newUser.firstName,
        //             lastName: newUser.lastName,
        //             email: newUser.email,
        //             role: newUser.role,
        //             phone: newUser.phone,
        //             userstatus: newUser.userstatus,
        //             profileImageLink: newUser.profileImageLink,
        //             bio: newUser.bio,
        //             createdAt: newUser.createdAt,
        //             updatedAt: newUser.updatedAt
        //         },
        //         token: token
        //     });
        // } catch (error) {
        //     res.status(500).json({ message: error.message });
        // }
    }

    static async userCreate(req, res) {
        try {

            // Validate incoming input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json(Responses.errorResponse(errors))
            }

            if (typeof req.body.phone !== "number") {
                return res.status(400).json(Responses.errorResponse({ message: "Please enter number values for phone" }))
            }

            // let password = UniqueId.create_password(req.body.firstName);
            const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);

            //req.body.password = EncryptDecrypt.crypt(req.body.password);
            const rouds = parseInt(process.env.BCRYPT_SALT);
            const hash = await bcrypt.hash(req.body.password, rouds);
            req.body.password = hash;
            req.body.userPassword = encryptedPassword;

            const result = await UserService.createUser(req);
            const {
                status, error, message, data
            } = result;

            if (status) {
                // data.password = password;
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                return res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async usersGet(req, res) {
        try {

            // if (req.authData.role !== "management") {
            //     throw Unauthorized("Only admin can see all users");
            // }

            const result = await UserService.getAllUser();
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

    static async userUpdate(req, res) {
        try {

            if (req.authData.user.type != "superadmin") {
                if (req.authData.user._id !== req.params.id) {
                    throw Unauthorized("Unauthorized");
                }
            }

            // Validate incoming input
            if (!req.query.keyword) {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json(Responses.errorResponse(errors))
                }
                if (typeof req.body.phone !== "number") {
                    return res.status(400).json(Responses.errorResponse({ message: "Please enter number values for phone" }))
                }
                // req.body.password = EncryptDecrypt.crypt(req.body.password);
            }

            if(req.body.password){
                const encryptedPassword = EncryptAndDecrypt.encrypt(req.body.password);
                const salt = bcrypt.genSaltSync(parseInt(process.env.BCRYPT_SALT));
                const hash = bcrypt.hashSync(req.body.password, salt);
                req.body.password = hash;
                req.body.userPassword = encryptedPassword;
            }
            const result = await UserService.userUpdate(req);
            const {
                status, error, message, data
            } = result;
            if (status) {
                res.status(201).json(Responses.successResponse(message, data));
            } else {
                res.status(error.status || 500).json(Responses.errorResponse(error));
            }
        } catch (error) {
            console.log("error >>>>>>>>>>>>>>>>>",error);
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    static async userDelete(req, res) {
        try {
            const result = await UserService.userDelete(req);
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

    static async userLogin(req, res) {
        const result = await UserService.loginEmailOrPhone(req.body);

        const {
            status, error, message, data
        } = result;
        if (status) {
            res.status(200).json(Responses.successResponse(message, data));
        } else {
            res.status(error.status || 500).json(Responses.errorResponse(error));
        }
    }
    
    static async userVerifyOTPLogin(req, res) {
        const result = await UserService.loginPhoneVerifyOtp(req);

        const {
            status, error, message, data
        } = result;
        if (status) {
            res.status(200).json(Responses.successResponse(message, data));
        } else {
            res.status(error.status || 500).json(Responses.errorResponse(error));
        }
    }

    
    //fetches user detail with id
    static async fetchUserWithId(req, res) {

        try {

            // console.log("req.authData.role ---------------- ", req.authData);
            // const permission = roles.can(req.authData.user.role).readOwn('profile').granted;
            // console.log('permission: ',permission);

            // if (req.authData.role != "management") {
            //     if (req.authData.id !== req.params.id) {
            //         throw Unauthorized("Unauthorized");
            //     }
            // }
            User.findById({ _id: req.params.id }, function (err, info) {
                if (err) {
                    res.status(404).json(err);
                }
                else {

                    if(info){
    
                        info.userPassword = EncryptAndDecrypt.decrypt(info.userPassword)
                        res.status(200).json(Responses.successResponse("Users found Sucessfully", info))
                        // res.json(info);
                        // console.log('res from contrlr:',res);
                    }else{
                        res.status(404).json(Responses.successResponse("User does not exist."))
                    }
                }
            })
        } catch (error) {
            res.status(error.status || 500).json(Responses.errorResponse(error));
        }

    }

    //fetch multiple users with pagination
    static async fetchUsers(req, res) {
        try {
            if (res.paginatedResults.data.results.length == 0) {
                res.paginatedResults.message = "No User found";
                res.paginatedResults.status = 404;
                console.log(res.paginatedResults);
                res.status(404).json(res.paginatedResults);
            }

            else {
                res.paginatedResults.message = "Users found Sucessfully";
                res.status(201).json(res.paginatedResults);
            }

        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    //search user with keyword
    static async searchUserWithKeyword(req, res) {
        try {
            if (req.authData.user.type != "superadmin") {
                throw Unauthorized("Unauthorized");
            }

            const result = await UserService.searchUserWithKeywordService(req);
            const { status, data, currentPage, totalPages, totaldocuments, message, error } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "totaldocuments": totaldocuments, "currentpage": currentPage, "totalpages": totalPages });

        }
        catch (error) {
            res.status(400).json(Responses.errorResponse(error));
        }
    }

    //gets called when requesting to reset password
    static async resetPasswordRequestController(req, res) {
        try {
            //passing email to find user
            const requestPasswordResetService = await UserService.requestPasswordReset(
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
            const resetPasswordService = await UserService.resetPassword(req);
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

    // updateUserProfile
    static async updateUserProfile(req, res) {
        try {

            if (req.authData.user.type != "superadmin") {
                if (req.authData.user._id !== req.params.id) {
                    throw Unauthorized("Unauthorized");
                }
            }

            let getUser = await User.findById({ _id: req.params.id })
            if (getUser == "null") {
                throw Unauthorized("User does not exist");
            }

            // File upload in S3
            let filename = `staging/users/${DateFormatter.getMonth(new Date())}/${getUser.id}/avtar.png`;
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

                req.body.profileImageLink = { name: req.file.originalname, key: response.Key, publicUrl: fileURL };
                const result = await UserService.updateUserProfile(req);
                const {
                    status, error, message, data
                } = result;
                if (status) {
                    res.status(201).json(Responses.successResponse(message, data));
                } else {
                    res.status(error.status || 500).json(Responses.errorResponse(error));
                }
            } else {
                res.status(error.status || 500).json(response);
            }

        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

    // getUserProfileImage
    static async getUserProfileImage(req, res) {
        try {
            const result = await UserService.getUserProfileImage(req, res);
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

    // deleteUserProfile
    static async deleteUserProfile(req, res) {
        try {

            if (req.authData.user.type != "superadmin") {
                if (req.authData.user._id !== req.params.id) {
                    throw Unauthorized("Unauthorized");
                }
            }

            const filename = path.basename(req.body.profileImageLink);
            const s3 = new AwsClient.AWS.S3({});
            let bucketName = `polstrat-backend/staging/users/${DateFormatter.getMonth(new Date())}`
            let deleteParams = { Key: filename, Bucket: bucketName };

            s3.deleteObject(deleteParams, async (err, response) => {
                if (err) {
                    return res.status(400).json(Responses.errorResponse(err))
                }

                req.body.profileImageLink = "";

                const result = await UserService.updateUserProfile(req);
                const {
                    status, error, message, data
                } = result;
                if (status) {
                    res.status(201).json(Responses.successResponse(message, data));
                } else {
                    res.status(error.status || 500).json(Responses.errorResponse(error));
                }
            })

        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

}

module.exports = UserController;
