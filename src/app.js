import "dotenv/config";
import express from "express";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // REQUIRE aws
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';

//* AWS S3 CONFIGURACIÓN
const awsRegion = process.env.AWS_REGION;
let s3 = new S3Client({
    region: awsRegion,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const app = express();

app.use(cors());

app.post("/upload", function (req, res) {
    const bucket = process.env.AWS_BUCKET_NAME;
    // Multer
    const storage = multer.memoryStorage();
    const upload = multer({ storage: storage });

    //FUNCIÓN DE SUBIDA S3
    upload.single('file')(req, res, async (err) => {
        if (err) console.log("error desde upload: ", err);
        else {
            // Obtén el nombre original del archivo
            const fileName = req.file.originalname;
            let carpetaInternaBucket = `imagenes/${fileName}`;
            let urlImagen = `https://${bucket}.s3.${awsRegion}.amazonaws.com/${carpetaInternaBucket}`; // ruta de imagen

            // Redimensionamos la imagen antes de subirla a s3
            const redimensionBuffer = await sharp(req.file.buffer)
                .resize({ width: 600, height: 600, fit: 'cover' })
                .toBuffer();

            const params = {
                Bucket: bucket,
                Key: carpetaInternaBucket,
                Body: redimensionBuffer,
                ContentType: 'image/jpeg',
            }

            // SUBIR LA IMAGEN
            const command = new PutObjectCommand(params);
            await s3.send(command)
                .then(response => {
                    return res.status(200).json({ urlImagen: urlImagen, mensaje: "archivo subido correctamente" });
                })
                .catch(error => {
                    console.log("Error al subir la imagen: ", error);
                    return res.status(500).json({ mensaje: "Error al subir la imagen" });
                });
        }
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});