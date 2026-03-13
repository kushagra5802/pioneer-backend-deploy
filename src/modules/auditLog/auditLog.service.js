const AuditLog = require("./auditLog.model");

class AuditLogService {
  
    static async getLogs(payload) {
        try {
            const page = parseInt(payload.query.page) || 1;
            const limit = parseInt(payload.query.limit) || 10;
            const skip = (page - 1) * limit;
                
            const total = await AuditLog.countDocuments();
            const getAuditLogs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

            return {
                status: true,
                data: getAuditLogs,
                auditLogCount: total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                message: "Audit Logs fetched successfully",
                error: null,
            };
        } catch (error) {
            return {
                status: false,
                data: null,
                message: "Error while getting logs",
                error
            };
        }
    }
};

module.exports = AuditLogService;