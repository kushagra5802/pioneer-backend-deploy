const Responses = require("../../utils/utils.response");
const AuditLogService = require("./auditLog.service");

class AuditLogController {
    
    static async getLogs(req, res) {
        try {
            const result = await AuditLogService.getLogs(req);
            const {auditLogCount,status, error, message, data, currentPage, totalPages
             } = result;
            return res.json({ "error": error, "status": status, "message": message, "data": data, "currentpage": currentPage, "totalpages": totalPages, "auditLogCount": auditLogCount});
        } catch (error) {
            res.status(400).json(Responses.errorResponse(error))
        }
    }

}

module.exports = AuditLogController;