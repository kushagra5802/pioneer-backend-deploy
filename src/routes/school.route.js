const { Router } = require('express');
const { validationResult } = require('express-validator');
const clientUserDataValidation = require("../modules/client/clientUser.validation")
const clientDataValidation = require('../modules/client/client.validation');
const { verifyToken } = require('../utils/utils.accessToken');
const ObjectId = require('mongoose').Types.ObjectId;
const router = Router();
// const manageAccessRole = require("../utils/utils.manage.access.Role");
const SchoolController = require('../controllers/school.controller');

///////////////////// CLIENT ROUTES ////////////////////////////
router.post('/login',SchoolController.schoolEmailPhoneLogin);

router.post('/schoolUsers',verifyToken,SchoolController.createSchoolUser);

router.get('/schoolUsers',verifyToken,SchoolController.getSchoolUser);

///////////////////// ADMIN ROUTES ////////////////////////////

router.post('/',verifyToken,SchoolController.schoolCreate);

router.get('/',verifyToken,SchoolController.getSchools);

router.get('/:id',verifyToken,SchoolController.getSchoolById);

router.delete('/:id',verifyToken,SchoolController.deleteSchool);

router.put('/:id',verifyToken,SchoolController.updateSchool);

module.exports = router;