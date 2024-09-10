const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const dotenv = require('dotenv');
dotenv.config();



const s3Client = new S3Client({
    endpoint: "https://lon1.digitaloceanspaces.com",
    forcePathStyle: false,
    region: "LON1",
    credentials: {
        accessKeyId: process.env.DO_ACCESS_KEY,
        secretAccessKey: process.env.DO_SECRET_KEY
    }
});
const preSignedUrl = async (req, res) => {
    const { fileName, fileType } = req.body;
    try {
        const params = {
            Bucket: "geniescareerhubbucket",
            Key: `Documents/${fileName}`,
            ContentType: fileType
        };
        const command = new PutObjectCommand(params);
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60000 });
        const publicUrl = `${process.env.DO_CDN_URL}/${fileName}`;
        res.status(200).send({
            success: true,
            url: signedUrl,
            fileURL: publicUrl
        });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        res.status(500).send({
            success: false,
            message: "An error occurred while generating signed URL"
        });
    }
}


module.exports = {
    preSignedUrl
}