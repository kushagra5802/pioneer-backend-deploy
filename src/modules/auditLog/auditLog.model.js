// // models/AuditLog.js
// const mongoose = require('mongoose');

// const AuditLogSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   userName: { type: String, required: true },
//   userRole: { type: String, enum: ['superadmin', 'admin'], required: true },
//   action: { type: String, required: true }, 
//   details: { type: Object }, 
//   ipAddress: { type: String },
//   changedFields:[{

//   }],
//   createdAt: { type: Date, default: Date.now }
// });

// // Index for faster cleanup/querying
// AuditLogSchema.index({ createdAt: 1 });

// module.exports = mongoose.model('AuditLog', AuditLogSchema);


// models/AuditLog.js
const mongoose = require('mongoose');

const ChangedFieldSchema = new mongoose.Schema({
  key: { type: String, required: false },
  from: { type: mongoose.Schema.Types.Mixed },
  to: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true },
  userRole: { type: String, enum: ['superadmin', 'admin'], required: true },
  action: { type: String, required: true },
  details: { type: String }, // Paragraph form
  ipAddress: { type: String },
  changedFields: [ChangedFieldSchema],
  createdAt: { type: Date, default: Date.now }
});

// Index for cleanup/querying
AuditLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
