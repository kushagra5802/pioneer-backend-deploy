
const data = require("./India_AC (5).js");
const parlimentModel = require("./src/modules/parliment/parliment.model");
const { MongoClient } = require("mongodb");
const uri = "mongodb://localhost:27017/";
const dbName = "polstrat"; // Replace with your database name


async function importData(){
  // Use reduce to group objects by ST_NAME
const groupedData = data.features.reduce((acc, obj) => {
  // Check if the ST_NAME exists in the accumulator
  if (!acc[obj.properties.ST_NAME]) {
    // If not, initialize an empty array for that ST_NAME
    acc[obj.properties.ST_NAME] = [];
  }
  
  // Check if PC_NAME already exists in the current ST_NAME array
  const existingPCNameIndex = acc[obj.properties.ST_NAME].findIndex(item => item.name === obj.properties.PC_NAME);

  if (existingPCNameIndex === -1) {
    // If PC_NAME doesn't exist, push the transformed object into the array corresponding to its ST_NAME
    acc[obj.properties.ST_NAME].push({
      name: obj.properties.PC_NAME,
      state: obj.properties.ST_NAME,
      district: obj.properties.DIST_NAME,
      type: 'central', // Assuming 'central' type for all objects
      boundaries: [obj.geometry] // Store geometry objects in an array
    });
  } else {
    // If PC_NAME already exists, add its geometry to the boundaries array
    acc[obj.properties.ST_NAME][existingPCNameIndex].boundaries.push(obj.geometry);
  }

  return acc;
}, {});

  // Convert groupedData object into an array of objects
  const resultArray = Object.keys(groupedData).map(ST_NAME => ({
    ST_NAME,
    data: groupedData[ST_NAME]
  }));
  
  // resultArray.map((ele) => {
  //   if(ele.ST_NAME === 'TRIPURA'){
  //       console.log(JSON.stringify(ele));
  //   }
  // });
  // try {
  //   await Promise.all(resultArray.map(async (element) => {
  //     console.log(element);
  //     await parlimentModel.insertMany(element.data);
  //   }));
  // } catch (error) {
  //   console.log(error);
  // }

  try {
    const client = new MongoClient(uri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("parliments"); // Replace with your collection name

    await collection.deleteMany({});
    console.log(`Deleted parliments data into the collection.⁠`);
    await Promise.all(resultArray.map(async (element) => {
      const result = await collection.insertMany(element.data);
      console.log(`⁠Inserted ${result.insertedCount} documents into the collection.⁠`);
    }));
    // Insert the formatted data into the collection
    
  } catch (error) {
    console.log(error);
  }

} 

importData();

//   console.log(resultArray);