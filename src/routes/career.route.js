const StudentController = require('../controllers/student.controller');
var multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const express = require("express");
const { verifyToken } = require('../utils/utils.accessToken');
const CareerController = require('../controllers/career.controller');
const router = express.Router();

router.post('/',verifyToken,CareerController.createCareer);
router.get('/',verifyToken,CareerController.getCareer);

module.exports = router;