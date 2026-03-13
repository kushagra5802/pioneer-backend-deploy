const { Upload } = require('@aws-sdk/lib-storage');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const { v4: uuid } = require('uuid');
const AwsClient = require('../config/awsconfig'); // your s3Instance

module.exports.uploadToS3 = async ({ files, userId, folder }) => {
  const uploadedFiles = [];

  for (const item of files) {
    const filename = `${folder}/${userId}/${uuid()}_${path.parse(item.originalname).name}.${item.originalname.split('.').pop()}`;

    const uploadParams = {
      Bucket: process.env.BUCKET,
      Key: filename,
      Body: item.buffer,
      ContentType: item.mimetype
    };

    const upload = new Upload({
      client: AwsClient.s3Instance,
      params: uploadParams
    });

    const response = await upload.done();

    if (response.$metadata.httpStatusCode !== 200) {
      throw new Error('File upload failed');
    }

    const signedUrl = await getSignedUrl(
      AwsClient.s3Instance,
      new GetObjectCommand({
        Bucket: process.env.BUCKET,
        Key: filename
      }),
      { expiresIn: 3600 }
    );

    uploadedFiles.push({
      guid: uuid(),
      key: filename,
      name: path.basename(filename),
      publicUrl: signedUrl
    });
  }

  return uploadedFiles;
};
