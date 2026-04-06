const express = require("express");
const StudentShortlistController = require("../controllers/studentShortlist.controller");
const { verifyToken } = require("../utils/utils.accessToken");

const router = express.Router();

router.get("/", verifyToken, StudentShortlistController.getShortlist);
router.post(
  "/careers/toggle",
  verifyToken,
  StudentShortlistController.toggleCareerShortlist
);
router.post(
  "/universities/toggle",
  verifyToken,
  StudentShortlistController.toggleUniversityShortlist
);

module.exports = router;
