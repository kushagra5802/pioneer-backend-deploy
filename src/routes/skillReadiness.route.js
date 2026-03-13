const StudentController = require('../controllers/student.controller');
const {upload} = require("../middleware/upload");
const express = require("express");
const { verifyToken } = require('../utils/utils.accessToken');
const SkillReadinessController = require('../controllers/skillReadiness.controller');
const router = express.Router();
const { multipleUpload } = require("../utils/utils.uploadFile");

/////////////////////// ADMIN ///////////////////////////////

router.post('/skill',verifyToken,SkillReadinessController.createSkill);

router.post('/mediaUpload',verifyToken,multipleUpload,SkillReadinessController.mediaUpload)

router.post('/week',verifyToken,SkillReadinessController.createWeek);

router.post('/assignment',verifyToken,SkillReadinessController.createAssignment);

router.get('/:skillId/review',verifyToken,SkillReadinessController.getSkillReview);

router.get('/skills',verifyToken,SkillReadinessController.getAllSkills);

router.get('/:skillId/edit',verifyToken,SkillReadinessController.getSkillForEdit);

router.delete('/:skillId/deleteSkill',verifyToken,SkillReadinessController.deleteSkill);

/////////////////////// CLIENT ///////////////////////////////

router.get('/skill',verifyToken,SkillReadinessController.getSkillByMonthYear);

router.get('/weeks',verifyToken,SkillReadinessController.getWeekBySkillAndNumber);

/////////////////////// WEEKLY ///////////////////////

router.post('/submitAssignment',verifyToken,SkillReadinessController.submitAssignment);

router.get('/getAssessmentResult',verifyToken,SkillReadinessController.getAssessmentResult);

/////////////////////// FInal Assessment ///////////////////////

router.get('/finalAssessment',verifyToken,SkillReadinessController.getFinalAssessmentQuestions);

router.post('/submitFinalAssessment',verifyToken,SkillReadinessController.submitFinalAssignment);

router.get('/getFinalAssessmentResult',verifyToken,SkillReadinessController.getFinalAssessmentResult);


module.exports = router;