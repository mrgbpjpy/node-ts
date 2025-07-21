import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = 'https://frontend-mu-two-39.vercel.app';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, path: tempPath } = file;
  const baseFilename = path.parse(originalname).name;
  const outputDir = path.join(__dirname, 'videos', baseFilename);
  const outputPath = path.join(outputDir, 'index.m3u8');
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseFilename}.jpg`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpeg = spawn('ffmpeg', [
    '-i', tempPath,
    '-vf', 'scale=1280:-2',
    '-c:v', 'libx264',
    '-profile:v', 'main',
    '-crf', '20',
    '-sc_threshold', '0',
    '-g', '48',
    '-keyint_min', '48',
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '128k',
    '-hls_time', '10',
    '-hls_playlist_type', 'vod',
    '-f', 'hls',
    outputPath
  ]);

  ffmpeg.on('close', (code) => {
    try {
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.warn('❌ Failed to delete temp file:', err);
    }

    if (code !== 0) {
      return res.status(500).json({ error: 'FFmpeg processing failed' });
    }

    const thumbnail = spawn('ffmpeg', [
      '-i', outputPath,
      '-ss', '00:00:02.000',
      '-vframes', '1',
      thumbnailPath
    ]);

    thumbnail.on('close', (thumbCode) => {
      if (thumbCode !== 0) {
        return res.status(500).json({ error: 'Thumbnail generation failed' });
      }

      return res.json({
        message: 'Upload and processing successful',
        streamUrl: `/videos/${baseFilename}/index.m3u8`,
        thumbnailUrl: `/thumbnails/${baseFilename}.jpg`
      });
    });

    thumbnail.on('error', (err) => {
      console.error('❌ Thumbnail error:', err);
      return res.status(500).json({ error: 'Thumbnail generation error' });
    });
  });

  ffmpeg.on('error', (err) => {
    console.error('❌ FFmpeg error:', err);
    return res.status(500).json({ error: 'FFmpeg execution error' });
  });
});

// General error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
