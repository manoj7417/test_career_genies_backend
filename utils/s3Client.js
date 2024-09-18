const AWS = require('aws-sdk');
require('dotenv').config()

const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT),
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET
});


const uploadfile = async (filename, file) => {
    const uploadParams = {
        Bucket: process.env.DO_SPACES_BUCKET || 'geniescareerhubbucket',
        Key: filename,
        Body: file,
        ACL: 'public-read'
    };

    const result = await s3.upload(uploadParams).promise();

    return result;
}

module.exports = { uploadfile }