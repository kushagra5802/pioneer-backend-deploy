const express = require("express");
const StudentExperienceController = require("../controllers/studentExperience.controller");
const { verifyToken } = require("../utils/utils.accessToken");

const router = express.Router();

router.post("/", verifyToken, StudentExperienceController.createContent);
router.get("/", verifyToken, StudentExperienceController.getContent);
router.patch("/:id", verifyToken, StudentExperienceController.updateContent);
router.delete("/:id", verifyToken, StudentExperienceController.deleteContent);

module.exports = router;
