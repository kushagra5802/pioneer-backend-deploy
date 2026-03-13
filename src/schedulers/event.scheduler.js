const cron = require('node-cron');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const AWS = require('aws-sdk');

const EventSchedulerModel = require('../modules/eventScheduler/eventScheduler.model');
const ClientOffice = require('../modules/client/clientOffice.model');
const ReportModel = require('../modules/report/requestedReport.model');
const Client = require('../modules/client/client.model'); 

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.ACCESS_SECRET,
  region: process.env.REGION
});

function runEventScheduler() {
  cron.schedule('0 1 1 * *', async () => {
  // cron.schedule('* * * * *', async () => {
    console.log("[EventScheduler] Generating monthly events reports...");

    try {
      const now = moment();
      const startOfLastMonth = now.clone().subtract(1, 'month').startOf('month');
      const endOfLastMonth = startOfLastMonth.clone().endOf('month');
       // Calculate start and end of the "last-to-last month"
      const startOfTwoMonthsAgo = now.clone().subtract(2, 'month').startOf('month');
      const endOfTwoMonthsAgo = startOfTwoMonthsAgo.clone().endOf('month');

      // Fetch all users
      const users = await Client.find({status:"active"}).lean();
      if (!users.length) {
        console.log("[EventScheduler] No users found.");
        return;
      }

      for (const user of users) {

        const events = await EventSchedulerModel.find({
          clientId: user._id,
          start: { $gte: startOfLastMonth.toDate(), $lte: endOfLastMonth.toDate() },
          status: { $ne: 'cancelled' }
        }).lean();

        if (!events.length) {
          console.log(`[EventScheduler] No events found for user ${user.adminFirstName} ${user.adminLastName}`);
          continue;
        }
        // Map office names
        const officeIds = [...new Set(events.map(e => e.officeId).filter(Boolean).map(id => id.toString()))];
        const officeMap = {};

        if (officeIds.length) {
          const offices = await ClientOffice.find({ _id: { $in: officeIds } });
          offices.forEach(o => {
            officeMap[o._id.toString()] = o.officeName;
          });
        }

        events.forEach(e => {
          e.officeName = officeMap[e.officeId?.toString()] || '';
        });

        // Excel setup
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Events');

        const headerRow = [
          "S.No", "Event Title", "Name", "Phone Number", "Type of Event",
          "Visitor Type / Invitation Type / Appointment Type", "Date", "Start Time", "End Time",
          "Status", "Address", "Office", "Purpose", "Submitted By", "Created At"
        ];

        worksheet.addRow(headerRow);
        headerRow.forEach((_, i) => {
          worksheet.getRow(1).getCell(i + 1).font = { bold: true };
        });

        events.forEach((e, index) => {
          const row = [
            index + 1,
            e.eventTitle || '',
            `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            e.phone || '',
            e.typeOfEvent ? e.typeOfEvent.charAt(0).toUpperCase() + e.typeOfEvent.slice(1) : '',
            e.visitorType,
            moment(e.start).format('YYYY-MM-DD'),
            moment(e.start).format('HH:mm'),
            moment(e.end).format('HH:mm'),
            e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : '',
            e.address || '',
            e.officeName || '',
            e.description || '',
            e.createdByUserName || '',
            moment(e.createdAt).format('YYYY-MM-DD'),
          ];
          worksheet.addRow(row);
        });

        const reportsDir = path.join(__dirname, '../temp_reports');
        fs.mkdirSync(reportsDir, { recursive: true });

        const monthYear = startOfLastMonth.format('MM-YYYY');
        const fileName = `Events_Report_${user.firstName || 'User'}_${monthYear}_${Date.now()}.xlsx`;
        const filePath = path.join(reportsDir, fileName);

        await workbook.xlsx.writeFile(filePath);

        const s3Key = `staging/report/${monthYear}/system/${fileName}`;
        const fileContent = fs.readFileSync(filePath);

        const s3Upload = await s3.upload({
          Bucket: process.env.BUCKET,
          Key: s3Key,
          Body: fileContent,
          ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }).promise();

        await ReportModel.create({
          reportName: `Events Report ${startOfLastMonth.format('MMMM YYYY')}`,
          description: `Monthly report of events from ${startOfLastMonth.format('YYYY-MM-DD')} to ${endOfLastMonth.format('YYYY-MM-DD')}`,
          resourceLocation: [{
            name: fileName,
            key: s3Key,
            publicUrl: s3Upload.Location
          }],
          status: "close",
          type: "free",
          isDecline: "false",
          clientId: user._id,
          clientName:user.adminFirstName + " " + user.adminLastName,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        fs.unlinkSync(filePath);
        console.log(`[EventScheduler] Report for ${user.adminFirstName} uploaded.`);
        // Delete events from "last-to-last month"
        const deleteResult = await EventSchedulerModel.deleteMany({
          clientId: user._id,
          start: { $gte: startOfTwoMonthsAgo.toDate(), $lte: endOfTwoMonthsAgo.toDate() }
        });
        console.log(`[EventScheduler] Deleted ${deleteResult.deletedCount} events from ${startOfTwoMonthsAgo.format('MMMM YYYY')} for ${user.adminFirstName}`);
      }

    } catch (err) {
      console.error('[EventScheduler] Report generation failed:', err.message);
    }
  });

  console.log("Event report scheduler initialized");
}

module.exports = runEventScheduler;


// const cron = require('node-cron');
// const moment = require('moment');
// const fs = require('fs');
// const path = require('path');
// const ExcelJS = require('exceljs');
// const AWS = require('aws-sdk');

// const EventSchedulerModel = require('../modules/eventScheduler/eventScheduler.model');
// const ClientOffice = require('../modules/client/clientOffice.model');
// const ReportModel = require('../modules/report/requestedReport.model');

// // Configure AWS S3
// const s3 = new AWS.S3({
//   accessKeyId: process.env.ACCESS_KEY,
//   secretAccessKey: process.env.ACCESS_SECRET,
//   region: process.env.REGION
// });

// function runEventScheduler() {
// //   cron.schedule('* * * * *', async () => {
//   cron.schedule('0 1 1 * *', async () => {
//     console.log("[EventScheduler] Generating monthly events report...");
//     try {
//       const now = moment();
//       const startOfLastMonth = now.clone().subtract(1, 'month').startOf('month');
//       const endOfLastMonth = startOfLastMonth.clone().endOf('month');

//         const events = await EventSchedulerModel.find({
//           start: { $gte: startOfLastMonth.toDate(), $lte: endOfLastMonth.toDate() },
//           status: { $ne: 'cancelled' }
//         }).lean();
//     //   console.log("events",events)
//       if (!events.length) {
//         console.log('[EventScheduler] No events to report for last month.');
//         return;
//       }

//       // Populate office names
//       const officeIds = [...new Set(events.map(e => e.officeId).filter(Boolean).map(id => id.toString()))];
//       const officeMap = {};

//       if (officeIds.length) {
//         const offices = await ClientOffice.find({ _id: { $in: officeIds } });
//         offices.forEach(o => {
//           officeMap[o._id.toString()] = o.officeName;
//         });
//       }

//       events.forEach(e => {
//         e.officeName = officeMap[e.officeId?.toString()] || '';
//       });

//       // Excel generation
//       const workbook = new ExcelJS.Workbook();
//       const worksheet = workbook.addWorksheet('Events');

//       const headerRow = [
//         "S.No", "Event Title", "Name", "Phone Number", "Type of Event","Visitor Type / Invitation Type / Appointment Type","Date", "Start Time", "End Time", "Status", "Address","Office", "Purpose", "Submitted By, Created At"
//       ];

//       worksheet.addRow(headerRow);

//       headerRow.forEach((_, i) => {
//         const cell = worksheet.getRow(1).getCell(i + 1);
//         cell.font = { bold: true };
//       });

//       events.forEach((e, index) => {
//         // let dynamicType = '';
//         // if (e.typeOfEvent === 'appointment') dynamicType = e.visitorType || '';
//         // else if (e.typeOfEvent === 'invitation') dynamicType = e.visitorType || '';
//         // else if (e.typeOfEvent === 'visit') dynamicType = e.visitorType || '';

//         const row = [
//           index + 1,
//           e.eventTitle || '',
//           `${e.firstName || ''} ${e.lastName || ''}`.trim(),
//           e.phone || '',
//           e.typeOfEvent ? e.typeOfEvent.charAt(0).toUpperCase() + e.typeOfEvent.slice(1) : '',
//           e.visitorType,
//           moment(e.start).format('YYYY-MM-DD'),
//           moment(e.start).format('HH:mm'),
//           moment(e.end).format('HH:mm'),
//           e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : '',
//           e.address || '',
//           e.officeName || '',
//           e.description || '',
//           e.createdByUserName || '',
//           moment(e.createdAt).format('YYYY-MM-DD'),
//         ];

//         worksheet.addRow(row);
//       });

//       const reportsDir = path.join(__dirname, '../temp_reports');
//       fs.mkdirSync(reportsDir, { recursive: true });

//       const monthYear = startOfLastMonth.format('MM-YYYY');
//       const fileName = `Events_Report_${monthYear}_${Date.now()}.xlsx`;
//       const filePath = path.join(reportsDir, fileName);

//       await workbook.xlsx.writeFile(filePath);

//       const s3Key = `staging/report/${monthYear}/system/${fileName}`;
//       const fileContent = fs.readFileSync(filePath);

//       const s3Upload = await s3.upload({
//         Bucket: process.env.BUCKET,
//         Key: s3Key,
//         Body: fileContent,
//         ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//         }).promise();

//       await ReportModel.create({
//         reportName: `Events Report ${startOfLastMonth.format('MMMM YYYY')}`,
//         // uploadedBy: null,
//         description: `Your last month report of events is here from ${startOfLastMonth.format('YYYY-MM-DD')} to ${endOfLastMonth.format('YYYY-MM-DD')}`,
//         resourceLocation: [{
//           name: fileName,
//           key: s3Key,
//           publicUrl: s3Upload.Location
//         }],
//         status: "close",
//         type: "free",
//         isDecline:"false",
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });

//       fs.unlinkSync(filePath);
//       console.log(`[EventScheduler] ✅ Report generated and uploaded: ${fileName}`);
//     } catch (err) {
//       console.error('[EventScheduler] ❌ Report generation failed:', err.message);
//     }
//   });

//   console.log("Event report scheduler initialized");
// }

// module.exports = runEventScheduler;


// const cron = require('node-cron');
// const moment = require('moment');
// const fs = require('fs');
// const path = require('path');
// const PDFDocument = require('pdfkit');
// const AWS = require('aws-sdk');

// const EventSchedulerModel = require('../modules/eventScheduler/eventScheduler.model');
// const ClientOffice = require('../modules/client/clientOffice.model');
// const ReportModel = require('../modules/report/requestedReport.model');

// // Configure AWS S3
// const s3 = new AWS.S3({
//   accessKeyId: process.env.ACCESS_KEY,
//   secretAccessKey: process.env.ACCESS_SECRET,
//   region: process.env.REGION
// });

// function runEventScheduler() {
// //   cron.schedule('* * * * *', async () => {
//   cron.schedule('0 1 1 * *', async () => {
//     console.log("[EventScheduler] Generating monthly events report (PDF)...");

//     try {
//       const now = moment();
//       const startOfLastMonth = now.clone().subtract(1, 'month').startOf('month');
//       const endOfLastMonth = startOfLastMonth.clone().endOf('month');

//       const events = await EventSchedulerModel.find({
//         start: { $gte: startOfLastMonth.toDate(), $lte: endOfLastMonth.toDate() },
//         status: { $ne: 'cancelled' }
//       }).lean();

//       if (!events.length) {
//         console.log('[EventScheduler] No events to report for last month.');
//         return;
//       }

//       // Populate office names
//       const officeIds = [...new Set(events.map(e => e.officeId).filter(Boolean).map(id => id.toString()))];
//       const officeMap = {};

//       if (officeIds.length) {
//         const offices = await ClientOffice.find({ _id: { $in: officeIds } });
//         offices.forEach(o => {
//           officeMap[o._id.toString()] = o.officeName;
//         });
//       }

//       events.forEach(e => {
//         e.officeName = officeMap[e.officeId?.toString()] || '';
//       });

//       // === Create PDF ===
//       const reportsDir = path.join(__dirname, '../temp_reports');
//       fs.mkdirSync(reportsDir, { recursive: true });

//       const monthYear = startOfLastMonth.format('MM-YYYY');
//       const fileName = `Events_Report_${monthYear}_${Date.now()}.pdf`;
//       const filePath = path.join(reportsDir, fileName);

//       const doc = new PDFDocument({ margin: 30 });
//       const writeStream = fs.createWriteStream(filePath);
//       doc.pipe(writeStream);

//       doc.fontSize(16).text(`Events Report: ${startOfLastMonth.format('MMMM YYYY')}`, { align: 'center' });
//       doc.moveDown();

//       const header = [
//         "S.No", "Event Title", "Name", "Phone", "Type",
//         "Date", "Start", "End", "Status", "Address",
//         "Type Details", "Office", "Purpose", "Submitted By"
//       ];

//       doc.fontSize(10).text(header.join(' | '));
//       doc.moveDown(0.5);

//       events.forEach((e, index) => {
//         let dynamicType = '';
//         if (e.typeOfEvent === 'appointment') dynamicType = e.appointmentType || '';
//         else if (e.typeOfEvent === 'invitation') dynamicType = e.invitationType || '';
//         else if (e.typeOfEvent === 'visit') dynamicType = e.visitorType || '';

//         const row = [
//           index + 1,
//           e.eventTitle || '',
//           `${e.firstName || ''} ${e.lastName || ''}`.trim(),
//           e.phone || '',
//           e.typeOfEvent,
//           moment(e.start).format('YYYY-MM-DD'),
//           moment(e.start).format('HH:mm'),
//           moment(e.end).format('HH:mm'),
//           e.status,
//           e.address || '',
//           dynamicType,
//           e.officeName || '',
//           e.description || '',
//           e.createdByUserName || ''
//         ];

//         doc.text(row.join(' | '), {
//           width: 540,
//           ellipsis: true
//         });

//         doc.moveDown(0.5);
//       });

//       doc.end();

//       await new Promise((resolve, reject) => {
//         writeStream.on('finish', resolve);
//         writeStream.on('error', reject);
//       });

//       // === Upload to S3 ===
//       const s3Key = `staging/report/${monthYear}/system/${fileName}`;
//       const fileContent = fs.readFileSync(filePath);

//       const s3Upload = await s3.upload({
//         Bucket: process.env.BUCKET,
//         Key: s3Key,
//         Body: fileContent,
//         ContentType: 'application/pdf'
//       }).promise();

//       await ReportModel.create({
//         reportName: `Events Report ${startOfLastMonth.format('MMMM YYYY')}`,
//         description: `Your last month report of events is here from ${startOfLastMonth.format('YYYY-MM-DD')} to ${endOfLastMonth.format('YYYY-MM-DD')}`,
//         resourceLocation: [{
//           name: fileName,
//           key: s3Key,
//           publicUrl: s3Upload.Location
//         }],
//         status: "close",
//         type: "free",
//         isDecline:"false",
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });

//       fs.unlinkSync(filePath);
//       console.log(`[EventScheduler] ✅ PDF report generated and uploaded: ${fileName}`);
//     } catch (err) {
//       console.error('[EventScheduler] ❌ PDF report generation failed:', err.message);
//     }
//   });

//   console.log("Event report scheduler initialized");
// }

// module.exports = runEventScheduler;
