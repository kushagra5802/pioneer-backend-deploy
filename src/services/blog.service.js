const { Forbidden, InternalServerError, Unauthorized } = require("http-errors");
const mongoose = require("mongoose");
const Blog = require("../models/blog.model")
const User = require("../modules/user/user.model")
const {uploadToS3} = require("../utils/uploadToS3")
const {deleteFromS3} = require("../utils/deleteFromS3");
const { S3Client,GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

class BlogService {
    
    static async createBlog(req) {
        let uploadedMedia = [];

        try {

            const { title, description, media } = req.body;
            console.log("req",req.body)
            const studentId = req.authData.user._id;

            if (!studentId || !title || !description) {
            throw {
                status: 400,
                message: "studentId, title and description are required"
            };
            }

            /* =========================
            Parse media
            ========================= */

            const parsedMedia =
            typeof media === "string"
                ? JSON.parse(media)
                : media || [];

            uploadedMedia = parsedMedia;
            console.log("uploadedMedia",uploadedMedia)
            let imageUrls = [];

            for (const file of parsedMedia) {
            if (file.mimetype?.startsWith("image")) {
                imageUrls.push({
                    key: file.key,
                    url: file.publicUrl,
                    name: file.name
                });
            }
            }
            console.log("imageUrls",imageUrls)
            /* =========================
            Create Blog
            ========================= */

            const blog = await Blog.create({
            studentId,
            title,
            description,
            imageUrls
            });

            return {
            status: true,
            message: "Blog submitted successfully. Waiting for approval.",
            data: blog
            };

        } catch (error) {

            /* =========================
            Cleanup uploaded media
            ========================= */

            for (const file of uploadedMedia) {
            if (file?.key) {
                await deleteFromS3(file.key);
            }
            }

            return {
            status: false,
            error: {
                status: error.status || 500,
                message: error.message || "Failed to create blog"
            }
            };

        }
    }

    static async getApprovedBlogs(query) {
        try {

            const page = parseInt(query.page) || 1;
            const limit = parseInt(query.limit) || 10;
            const skip = (page - 1) * limit;

            const totalBlogs = await Blog.countDocuments({ isApproved: true });

            const blogs = await Blog.find({ isApproved: true })
            .populate({
                path: "studentId",
                select: "studentId personalInfo.fullName academicInfo.classGrade academicInfo.section"
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

            if (!blogs.length) {
            throw {
                status: 404,
                message: "No approved blogs found"
            };
            }

            /* =========================
            S3 CLIENT
            ========================= */

            const s3Client = new S3Client({
                credentials: {
                    accessKeyId: process.env.ACCESS_KEY,
                    secretAccessKey: process.env.ACCESS_SECRET,
                },
                region: process.env.REGION,
            });

            for (let blog of blogs) {
                if (blog?.imageUrls && Array.isArray(blog.imageUrls)) {

                    const validImages = blog.imageUrls.filter(file => file && file.key);

                    for (let file of validImages) {
                        try {

                            const command = new GetObjectCommand({
                            Bucket: process.env.BUCKET,
                            Key: file.key
                            });

                            const signedUrl = await getSignedUrl(s3Client, command, {
                            expiresIn: 1800
                            });

                            file.url = signedUrl;

                        } catch (err) {
                            console.error(
                            "Error generating signed URL for blog image:",
                            err.message
                            );
                        }
                    }

                    blog.imageUrls = validImages;
                }
            }

            return {
            status: true,
            message: "Approved blogs fetched successfully",
            data: {
                blogs,
                pagination: {
                totalBlogs,
                currentPage: page,
                totalPages: Math.ceil(totalBlogs / limit),
                limit
                }
            }
            };

        } catch (error) {

            return {
            status: false,
            error: {
                status: error.status || 500,
                message: error.message || "Failed to fetch blogs"
            }
            };

        }
    }

    static async getAllBlogs(query) {
        try {

        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const skip = (page - 1) * limit;

        // Total approved blogs count
        const totalBlogs = await Blog.countDocuments();

        const blogs = await Blog.find()
            .populate({
            path: "studentId",
            select: "studentId personalInfo.fullName academicInfo.classGrade academicInfo.section"
            })
            // .select("title description studentId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        if (!blogs.length) {
            throw {
            status: 404,
            message: "No approved blogs found"
            };
        }

        /* =========================
        S3 CLIENT
        ========================= */

        const s3Client = new S3Client({
            credentials: {
                accessKeyId: process.env.ACCESS_KEY,
                secretAccessKey: process.env.ACCESS_SECRET,
            },
            region: process.env.REGION,
        });

        for (let blog of blogs) {
            if (blog?.imageUrls && Array.isArray(blog.imageUrls)) {

                const validImages = blog.imageUrls.filter(file => file && file.key);

                for (let file of validImages) {
                    try {

                        const command = new GetObjectCommand({
                        Bucket: process.env.BUCKET,
                        Key: file.key
                        });

                        const signedUrl = await getSignedUrl(s3Client, command, {
                        expiresIn: 1800
                        });

                        file.url = signedUrl;

                    } catch (err) {
                        console.error(
                        "Error generating signed URL for blog image:",
                        err.message
                        );
                    }
                }

                blog.imageUrls = validImages;
            }
        }

        return {
            status: true,
            message: "Approved blogs fetched successfully",
            data: {
            blogs,
            pagination: {
                totalBlogs,
                currentPage: page,
                totalPages: Math.ceil(totalBlogs / limit),
                limit
            }
            }
        };

        } catch (error) {

        return {
            status: false,
            error: {
            status: error.status || 500,
            message: error.message || "Failed to fetch blogs"
            }
        };

        }
    }

    static async approveBlog(req) {
        try {
        const { blogId } = req.params;
        const userId = req.authData.user._id
        if (!mongoose.Types.ObjectId.isValid(blogId)) {
            throw {
            status: 400,
            message: "Invalid blog id"
            };
        }

        const blog = await Blog.findById(blogId);

        if (!blog) {
            throw {
            status: 404,
            message: "Blog not found"
            };
        }

        if (blog.isApproved) {
            throw {
            status: 400,
            message: "Blog is already approved"
            };
        }

        const user = await User.findById(userId)
        .select("firstName lastName")
        .lean();

      if (!user) {
        throw {
          status: 404,
          message: "Approving user not found"
        };
      }

      const fullName = `${user.firstName} ${user.lastName}`;
        blog.isApproved = true;
        blog.approvedBy = userId;
        blog.approvedByName = fullName;

        await blog.save();

        return {
            status: true,
            message: "Blog approved successfully",
            data: blog
        };

        } catch (error) {

        return {
            status: false,
            error: {
            status: error.status || 500,
            message: error.message || "Failed to approve blog"
            }
        };

        }
    }

    static async getPersonalBlogs(req) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const studentId=req.authData.user._id;

            if (!studentId) {
                throw {
                    status: 401,
                    message: "Student not authenticated"
                };
            }

            const totalBlogs = await Blog.countDocuments({ studentId });

            const blogs = await Blog.find({ studentId })
                .populate({
                    path: "studentId",
                    select: "studentId personalInfo.fullName academicInfo.classGrade academicInfo.section"
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            if (!blogs.length) {
                throw {
                    status: 404,
                    message: "No blogs found for this student"
                };
            }

            /* =========================
            S3 CLIENT
            ========================= */

            const s3Client = new S3Client({
                credentials: {
                    accessKeyId: process.env.ACCESS_KEY,
                    secretAccessKey: process.env.ACCESS_SECRET,
                },
                region: process.env.REGION,
            });

            for (let blog of blogs) {
                if (blog?.imageUrls && Array.isArray(blog.imageUrls)) {

                    const validImages = blog.imageUrls.filter(file => file && file.key);

                    for (let file of validImages) {
                        try {

                            const command = new GetObjectCommand({
                            Bucket: process.env.BUCKET,
                            Key: file.key
                            });

                            const signedUrl = await getSignedUrl(s3Client, command, {
                            expiresIn: 1800
                            });

                            file.url = signedUrl;

                        } catch (err) {
                            console.error(
                            "Error generating signed URL for blog image:",
                            err.message
                            );
                        }
                    }

                    blog.imageUrls = validImages;
                }
            }

            return {
                status: true,
                message: "Student blogs fetched successfully",
                data: {
                    blogs,
                    pagination: {
                        totalBlogs,
                        currentPage: page,
                        totalPages: Math.ceil(totalBlogs / limit),
                        limit
                    }
                }
            };

        } catch (error) {

            return {
                status: false,
                error: {
                    status: error.status || 500,
                    message: error.message || "Failed to fetch student blogs"
                }
            };

        }
    }
}

module.exports = BlogService;