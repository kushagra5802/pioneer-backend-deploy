const PreVerify = require('../utils/preVerify_user_client')
const UserController = require('../modules/user/user.controller');
const User = require('../modules/user/user.model');
const Pagination = require('../utils/utils.pagination');
const fileUpload = require("../utils/utils.uploadUserProfile");

const userDataValidation = require('../modules/user/user.validation');
const express = require("express");
const { verifyToken, verifyToken_CallBack_Only } = require('../utils/utils.accessToken');
const router = express.Router();


const results = { password: 0, resetPasswordToken: 0 };

/*
type: post
Route: Login User 
*/
router.post("/login", PreVerify.verifyUser, UserController.userLogin);
router.post("/verify-otp-login", UserController.userVerifyOTPLogin);

router.post("/register", UserController.register);

/*
type: post
Route: Create User 
userDataValidation:  Middleware used to validate user data
*/

router.post('/', userDataValidation, verifyToken, UserController.userCreate);

/*
type: get
Route: Get All Users
*/
router.get('/', verifyToken, UserController.usersGet);

/*
type: put
parameter: id (userid)
Route: Update User
*/
router.put('/:id', verifyToken, userDataValidation, UserController.userUpdate);

/*
type: delete
parameter: id (userid)
Route: Detele user 
*/
router.delete('/:id', verifyToken, UserController.userDelete);

/*
type: post
Route: Request Reset Password 
*/
router.post("/auth/requestResetPassword", UserController.resetPasswordRequestController);

/*
type: post
Route: Request Reset Password 
*/
router.post("/auth/passwordReset", UserController.resetPasswordController);


/*
type: put
parameter: id (userid)
Route: Update User Profile 
verifyToken:  User Verification Middleware
*/
router.put("/info/profile/:id", verifyToken, fileUpload, UserController.updateUserProfile);

/*
type: Get User Profile Image
parameter: id (userid)
verifyToken:  User Verification Middleware
*/
router.get("/info/getProfileImage/:id", verifyToken, UserController.getUserProfileImage);

/*
type: Put
parameter: id (userid)
Route: Delete User Profile 
verifyToken:  User Verification Middleware
*/
router.put("/info/deleteProfile/:id", verifyToken, UserController.deleteUserProfile);

//fetch user detail with id
router.get("/info/:id", verifyToken, UserController.fetchUserWithId);

//fetch users with pagination
router.get("/info", verifyToken, Pagination.paginatedResults(User, results), UserController.fetchUsers);

//search with keyword and display with pagination
router.get("/search", verifyToken, UserController.searchUserWithKeyword);


module.exports = router;