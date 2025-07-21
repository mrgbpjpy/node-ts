// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const VIDEOS_DIR = path.join(__dirname, '../videos');

// Ensure directories exist
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(VIDEOS_DIR);

// Enable CORS for frontend on Vercel and local
const allowedOrigins = [
  'http://localhost:3000',
  'https://frontend-mu-two-39.vercel.app',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    console.log('Setting upload destination to:', UPLOADS_DIR);
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const name = Date.now() + '-' + file.originalname;
    console.log('Saving file as:', name);
    cb(null, name);
  },
});
const upload = multer({ storage });

// Upload route
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      console.warn('No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const filename = path.parse(req.file.filename).name;
    const outputDir = path.join(VIDEOS_DIR, filename);
    const outputM3U8 = path.join(outputDir, 'index.m3u8');

    console.log('Processing video:', inputPath);
    console.log('Output folder:', outputDir);
    console.log('Output stream file:', outputM3U8);

    await fs.ensureDir(outputDir);

    ffmpeg(inputPath)
      .outputOptions([
        '-codec: copy',           // ⚠️ common issue: `copy` is not valid with ':'; should be '-codec copy'
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(outputM3U8)
      .on('start', (cmd) => {
        console.log('FFmpeg started with command:', cmd);
      })
      .on('end', async () => {
        console.log('FFmpeg finished conversion');
        await fs.unlink(inputPath);
        const streamPath = `/videos/${filename}/index.m3u8`;
        console.log('Sending stream path to frontend:', streamPath);
        res.json({ streamUrl: streamPath });
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        res.status(500).json({ error: 'Video conversion failed' });
      })
      .run();

  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Serve static videos
app.use('/videos', express.static(VIDEOS_DIR));

// Health check
app.get('/', (_req, res) => {
  res.send('✅ Video upload backend is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
