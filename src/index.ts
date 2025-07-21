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

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Upload route
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const inputPath = req.file.path;
    const filename = path.parse(req.file.filename).name;
    const outputDir = path.join(VIDEOS_DIR, filename);
    const outputM3U8 = path.join(outputDir, 'index.m3u8');

    await fs.ensureDir(outputDir);

    ffmpeg(inputPath)
      .outputOptions([
        '-codec: copy',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(outputM3U8)
      .on('end', async () => {
        await fs.unlink(inputPath);
        res.json({ streamUrl: `/videos/${filename}/index.m3u8` });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        res.status(500).json({ error: 'Video conversion failed' });
      })
      .run();

  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Serve videos
app.use('/videos', express.static(VIDEOS_DIR));

// Root
app.get('/', (_req, res) => {
  res.send('✅ Video upload backend is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
