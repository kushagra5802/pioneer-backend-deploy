const Responses = require("../utils/utils.response");
const BlogService = require("../services/blog.service");
const AWS3 = require("@aws-sdk/client-s3");
const AwsClient = require("../config/awsconfig")
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require("@aws-sdk/lib-storage");
const path = require('path');
const { Readable } = require("stream");
const { v4: uuid } = require('uuid');


class BlogController {
    static async mediaUpload(req, res) {
        try {
        if (!req.files || req.files.length === 0) {
            return res
            .status(400)
            .json(Responses.successResponse({ message: "Please upload a file!" }));
        }

        const ResponseData = [];
        console.log("req.files",req.files)
        for (const file of req.files) {
            // Generate unique filename in S3
            let filename = `blogs/attachments/${req.authData.user._id}/${path.parse(file.originalname).name}-${uuid()}.${file.originalname.split('.').pop()}`;

            let startIndex =
            filename.indexOf("\\") >= 0
                ? filename.lastIndexOf("\\")
                : filename.lastIndexOf("/");
            let getFileName = filename.substring(startIndex);
            if (getFileName.indexOf("\\") === 0 || getFileName.indexOf("/") === 0) {
            getFileName = getFileName.substring(1);
            }

            // S3 upload params
            const params = {
            Key: filename,
            Bucket: process.env.BUCKET,
            Body: file.buffer,
            ContentType: file.mimetype,
            };

            // Generate signed URL (optional)
            const command = new AWS3.GetObjectCommand(params);
            const fileURL = await getSignedUrl(AwsClient.s3Instance, command, { expiresIn: 3600 });

            const stream = Readable.from(file.buffer);
            // Upload to S3
            const parallelUploads3 = new Upload({
            client: AwsClient.s3Instance,
            params: {
                Key: filename,
                Bucket: process.env.BUCKET,
                Body: stream,
                ContentType: file.mimetype,
            },
            });

            const response = await parallelUploads3.done();

            if (response.$metadata.httpStatusCode === 200) {
            ResponseData.push({
                guid: uuid(),
                name: getFileName,
                key: response.Key,
                publicUrl: fileURL,
                mimetype: file.mimetype,
            });
            } else {
            throw Unauthorized("File uploading failed");
            }
        }

        res
            .status(201)
            .json(Responses.successResponse("Files uploaded successfully", ResponseData));
        } catch (error) {
        res.status(400).json(Responses.errorResponse(error));
        }
    }

    static async createBlog(req, res) {
        try {
            const result = await BlogService.createBlog(req);
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
    static async getApprovedBlogs(req, res) {
        try {
            const result = await BlogService.getApprovedBlogs(req);
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
    static async getAllBlogs(req, res) {
        try {
            const result = await BlogService.getAllBlogs(req);
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
    static async approveBlog(req, res) {
        try {
            const result = await BlogService.approveBlog(req);
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
    static async getPersonalBlogs(req, res) {
        try {
            const result = await BlogService.getPersonalBlogs(req);
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

module.exports = BlogController;
