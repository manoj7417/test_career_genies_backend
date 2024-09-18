const AWS = require('aws-sdk');
const { uploadfile } = require('../utils/s3Client');

// Initialize S3 compatible API using DigitalOcean Spaces credentials
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT),
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET
});

async function uploadImage(fastify, options) {
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }
    const fileName = `GeniesCareerHub/${Date.now()}_${data.filename}`;

    try {
      const response = await uploadfile(fileName, data.file);
      if (!response) {
        return reply.code(400).send({ message: 'Error uploading file to DigitalOcean Spaces' });
      }
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
