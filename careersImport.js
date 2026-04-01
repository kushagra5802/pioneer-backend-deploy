const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Career = require("./src/models/career.model"); // update path

const MONGO_URI = "mongodb+srv://jainkushagra582_db_user:1JKIM9e3SRRxFaHw@pioneer.ghrhbwv.mongodb.net/";
const DB_NAME = "pioneer";

/* ----------------------------------
   HELPER FUNCTIONS
-----------------------------------*/

// Split by comma
const splitComma = (value) => {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
};
const splitSemiColan = (value) => {
  if (!value) return [];
  return value.split(";").map((v) => v.trim()).filter(Boolean);
};

// Split by dot (for sentences)
const splitDot = (value) => {
  if (!value) return [];
  return value
    .split(".")
    .map((v) => v.trim())
    .filter(Boolean);
};

// async function removeDuplicates() {
//   try {

//     await mongoose.connect(MONGO_URI + DB_NAME);

//     console.log("✅ MongoDB Connected");

//     console.log("🧹 Removing duplicates...");

//     const duplicates = await Career.aggregate([
//       {
//         $group: {
//           _id: {
//             title: "$title",
//             industry: "$industry"
//           },
//           ids: { $push: "$_id" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $match: {
//           count: { $gt: 1 }
//         }
//       }
//     ]);

//     let totalDeleted = 0;

//     for (const doc of duplicates) {
//       // keep first, delete rest
//       const [keep, ...remove] = doc.ids;

//       const result = await Career.deleteMany({
//         _id: { $in: remove }
//       });

//       totalDeleted += result.deletedCount;
//     }

//     console.log(`🗑️ Deleted ${totalDeleted} duplicate records`);
//   } catch (error) {
//     console.error("❌ Error removing duplicates:", error);
//   }
// }

// removeDuplicates();

async function importCareers() {
  try {
    /* ----------------------------------
       CONNECT DB
    -----------------------------------*/
    await mongoose.connect(MONGO_URI + DB_NAME);
    console.log("✅ MongoDB Connected");

    /* ----------------------------------
       READ EXCEL
    -----------------------------------*/
    const workbook = XLSX.readFile("./careers.xlsx");
    const sheetName = workbook.SheetNames[5];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📄 Rows found: ${rows.length}`);
    console.log("rows data",rows)
    /* ----------------------------------
       TRANSFORM DATA
    -----------------------------------*/
    const formattedData = rows.map((row) => ({
      title: row["Career "]?.trim(),
      industry: row["Sector"],
      description: row["Description"],
      progression: row["Career progression "],
    educationPath: row["Education_Path"],
      keySkills: splitComma(row["Key_Skills"]),
      topInstitutionsIndia: splitSemiColan(row["Colleges India"]),
      globalPathways: splitSemiColan(row["Abroad"]),

      /* NEW FIELDS */
      exposure: splitComma(row["Exposure"]),
      whatYouActuallyDo: splitDot(row["What You Actually Do"]),
      entranceExams: splitSemiColan(row["Entrance Exam"]),
      scholarships: splitSemiColan(row["Scholarships"]),
      lateralOptions: splitComma(row["Lateral Options"]),
      adjacentRoles: splitComma(row["Adjacent Roles"]),
      whoShouldNotChoose: row["Who Should Not Choose"]?.trim() || "",

      isSelected: false,
      isDeleted: false
    }));

    /* ----------------------------------
       REMOVE INVALID ROWS
    -----------------------------------*/
    const cleanData = formattedData.filter(
      (item) => item.title && item.industry
    );
    console.log("cleanData",cleanData)
    /* ----------------------------------
       INSERT NEW DATA
    -----------------------------------*/
    // const result = await Career.insertMany(cleanData, {
    //   ordered: false
    // });
    // console.log("result",result)
    // console.log(`🚀 Inserted ${result.length} careers`);

    /* ----------------------------------
   UPSERT DATA (NO DUPLICATES)
-----------------------------------*/
for (const item of cleanData) {
  await Career.updateOne(
    { title: item.title },
    { $set: item },
    { upsert: true }
  );
}

console.log(`Upserted ${cleanData.length} careers`);

    process.exit();
  } catch (error) {
    console.error("❌ Import error:", error);
    process.exit(1);
  }
}

importCareers();