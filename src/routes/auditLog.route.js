const { Router } = require('express');
var express = require('express')
const { verifyToken } = require('../utils/utils.accessToken');
const AuditLogController = require('../modules/auditLog/auditLog.controller');

const router = Router();
const app = express();

router.get("/getLogs",verifyToken,AuditLogController.getLogs);

module.exports = router;