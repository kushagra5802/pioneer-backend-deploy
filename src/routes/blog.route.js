const express = require("express");
const { verifyToken } = require('../utils/utils.accessToken');
const router = express.Router();
const BlogController = require("../controllers/blog.controller");
const { multipleUpload } = require("../utils/utils.uploadFile");

router.post('/mediaUpload',verifyToken,multipleUpload,BlogController.mediaUpload)

router.post('/createBlog',verifyToken,BlogController.createBlog);

router.get('/approvedBlogs',verifyToken,BlogController.getApprovedBlogs);

router.get('/allBlogs',verifyToken,BlogController.getAllBlogs);

router.patch('/approveBlog/:blogId',verifyToken,BlogController.approveBlog);

router.get('/personalBlogs',verifyToken,BlogController.getPersonalBlogs);

module.exports = router;