const mongoose = require("mongoose");
const XLSX = require("xlsx");
const University = require("./src/models/university.model"); // update path

const MONGO_URI = "mongodb+srv://jainkushagra582_db_user:1JKIM9e3SRRxFaHw@pioneer.ghrhbwv.mongodb.net/";
const DB_NAME = "pioneer";

/* ----------------------------------
   HELPERS
-----------------------------------*/
const splitComma = (value) => {
  if (!value) return [];
  return value.split(",").map(v => v.trim()).filter(Boolean);
};

const splitSemiColon = (value) => {
  if (!value) return [];
  return value.split(";").map(v => v.trim()).filter(Boolean);
};

/* ----------------------------------
   IMPORT FUNCTION
-----------------------------------*/
async function importUniversities() {
  try {
    /* CONNECT DB */
    await mongoose.connect(MONGO_URI + DB_NAME);
    console.log("MongoDB Connected");

    /* READ EXCEL */
    const workbook = XLSX.readFile("./university3.xlsx");
    const sheetName = workbook.SheetNames[1];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📄 Rows found: ${rows.length}`);

    /* TRANSFORM DATA */
    const formattedData = rows.map((row) => ({
      name: row["Institution Name"]?.trim(),
      city: row["City"],
      state: row["State"],
      country: row["Country"],

      rankAccreditation: row["Ranking / Accreditation"],

      type: row["Type"],
      establishedYear: row["Est."],
      
      coursesOffered: splitSemiColon(row["Courses Offered"]),
      specializations: splitComma(row["Specializations"]),

      feesRange: row["Annual Fees (tuition)"],
      averagePackage: row["Average Package"],
      highestPackage: row["Highest Package"],

      facilities: splitComma(row["Facilities"]),

      modeOfEntry: row["Mode of Admission"],
      acceptanceRate: row["Seats (approx/yr)"],
      cutOffTrend: row["Cutoff / Entry Standard"],

      entranceExams: splitSemiColon(row["Entrance Exam"]),

      officialWebsite: row["Website"],

      isDeleted: false
    }));

    /* REMOVE INVALID */
    const cleanData = formattedData.filter(
      (item) => item.name
    );

    console.log(`🧹 Clean rows: ${cleanData.length}`);

    /* UPSERT (NO DUPLICATES) */
    for (const item of cleanData) {
      await University.updateOne(
        { name: item.name },
        { $set: item },
        { upsert: true }
      );
    }

    console.log(`🚀 Upserted ${cleanData.length} universities`);

    process.exit();
  } catch (error) {
    console.error("❌ Import error:", error);
    process.exit(1);
  }
}

importUniversities();