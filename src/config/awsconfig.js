const AWS3 = require("@aws-sdk/client-s3");
const { S3Client } = require('@aws-sdk/client-s3');

let region = process.env.REGION;
let accessKeyId = process.env.ACCESS_KEY;
let secretAccessKey = process.env.ACCESS_SECRET;

// / Initializing S3 Interface V#
const s3Instance = new AWS3.S3Client({credentials: {accessKeyId, secretAccessKey}, region});

// Initializing S3Client
const s3 = new S3Client({credentials: {accessKeyId, secretAccessKey}, region});

module.exports = {
    s3Instance,
    s3
}
