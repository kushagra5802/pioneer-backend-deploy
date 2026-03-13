const express = require("express");
const { verifyToken } = require('../utils/utils.accessToken');
const router = express.Router();
const PsychometricController = require('../controllers/psychometric.controller');

router.get('/academicQuestions',verifyToken,PsychometricController.getAcademicQuestions);
router.post('/academicAssessment',verifyToken,PsychometricController.submitAssessment);
router.get('/academicResult/:id',verifyToken,PsychometricController.getAcademicResult);

router.post('/mbtiAssessment',verifyToken,PsychometricController.submitMBTIAssessment);
router.get('/mbtiResult/:id',verifyToken,PsychometricController.getMBTIResult);

router.get('/careerQuestions',verifyToken,PsychometricController.getCareerQuestions);
router.post('/careerAssessment',verifyToken,PsychometricController.submitCareerAssessment);
router.get('/careerResult/:id',verifyToken,PsychometricController.getCareerResult);

router.get('/riasecQuestions',verifyToken,PsychometricController.getRiasecQuestions);
router.post('/riasecAssessment',verifyToken,PsychometricController.submitRiasecAssessment);
router.get('/riasecResult/:id',verifyToken,PsychometricController.getRiasecResult);


module.exports = router;