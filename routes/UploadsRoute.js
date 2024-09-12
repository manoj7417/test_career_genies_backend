const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Initialize S3 compatible API using DigitalOcean Spaces credentials
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT || 'https://lon1.digitaloceanspaces.com'),
  accessKeyId: process.env.DO_SPACES_KEY || 'DO00ND68CJRPGZFB6MZL',
  secretAccessKey: process.env.DO_SPACES_SECRET || 'YufP8+PARoVRuWBT4lmugdur0GvtKnZ7Qzq9kz7PE78'
});

async function uploadImage(fastify, options) {
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file(); // Assuming you're using fastify-multipart for file uploads

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }
    // Generate a unique file name
    const fileName = `${Date.now()}_${data.filename}`;
    // Prepare params for uploading to DigitalOcean Spaces
    const uploadParams = {
      Bucket: process.env.DO_SPACES_BUCKET || 'geniescareerhubbucket',
      Key: fileName,
      Body: data.file,
      ACL: 'public-read'
    };

    try {
      const result = await s3.upload(uploadParams).promise();
      return reply.code(200).send({ message: 'File uploaded successfully', url: `${process.env.DO_CDN_URL}/${fileName}` });
    } catch (error) {
      console.error('Error uploading file: ', error);
      return reply.code(500).send({ error: 'Failed to upload file' });
    }
  });


  fastify.get('/getfile', async (request, reply) => {
    const { fileName } = request.query;
    if (!fileName) {
      return reply.code(400).send({ error: 'File name is required' });
    }


    try {
      // Construct the file URL or retrieve it from your storage (e.g., DigitalOcean Spaces)
      const fileUrl = `https://your-space-name.digitaloceanspaces.com/${fileName}`;

      // Redirect or send back the file URL to the client
      return reply.code(200).send({ message: 'File URL', url: fileUrl });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: 'Failed to fetch the file' });
    }
  });

}



module.exports = uploadImage;
