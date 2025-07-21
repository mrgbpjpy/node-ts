import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import busboy from 'busboy';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const PORT = process.env.PORT || 5000;

export { app }; // ✅ FIXED

app.post('/upload', (req: Request, res: Response) => {
  const bb = busboy({ headers: req.headers });
  let filePath = '';
  let fileName = '';
  let outputDir = '';
  let thumbnailPath = '';

  bb.on('file', (_fieldname: string, file: NodeJS.ReadableStream, filename: string) => {
    fileName = path.parse(filename).name.replace(/\s+/g, '_');
    filePath = path.join(__dirname, 'uploads', `${fileName}.mp4`);
    outputDir = path.join(__dirname, 'videos', fileName);
    thumbnailPath = path.join(__dirname, 'thumbnails', `${fileName}.jpg`);

    const writeStream = fs.createWriteStream(filePath);
    file.pipe(writeStream);
  });

  bb.on('finish', () => {
    fs.mkdirSync(outputDir, { recursive: true });

    ffmpeg(filePath)
      .outputOptions([
        '-vf scale=w=360:h=640:force_original_aspect_ratio=decrease',
        '-c:a aac',
        '-c:v libx264',
        '-preset veryfast',
        '-f hls',
        '-hls_time 4',
        '-hls_list_size 0',
        `-hls_segment_filename ${path.join(outputDir, 'segment_%03d.ts')}`
      ])
      .output(path.join(outputDir, 'index.m3u8'))
      .on('end', () => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: `${fileName}.jpg`,
            folder: path.join(__dirname, 'thumbnails'),
            size: '360x640'
          })
          .on('end', () => {
            fs.unlinkSync(filePath);
            res.json({
              streamUrl: `/videos/${fileName}/index.m3u8`,
              thumbnailUrl: `/thumbnails/${fileName}.jpg`
            });
          });
      })
      .on('error', err => {
        console.error('[ERROR] FFmpeg processing failed:', err);
        res.status(500).json({ error: 'FFmpeg processing failed' });
      })
      .run();
  });

  req.pipe(bb);
});

app.listen(PORT, () => {
  console.log(`[LOG] Backend running at http://localhost:${PORT}`);
});
