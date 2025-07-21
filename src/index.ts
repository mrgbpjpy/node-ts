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

// Ensure required directories exist
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(VIDEOS_DIR);

// CORS config for local and Vercel frontend
const allowedOrigins = [
  'http://localhost:3000',
  'https://frontend-mu-two-39.vercel.app',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    console.log(`Setting upload destination to: ${UPLOADS_DIR}`);
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const filename = Date.now() + '-' + file.originalname;
    console.log(`Saving file as: ${filename}`);
    cb(null, filename);
  }
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const inputPath = req.file.path;
    const filename = path.parse(req.file.filename).name;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const outputDir = path.join(VIDEOS_DIR, filename);
    const outputM3U8 = path.join(outputDir, 'index.m3u8');

    console.log(`Processing video: ${inputPath}`);
    console.log(`Output folder: ${outputDir}`);
    console.log(`Output stream file: ${outputM3U8}`);

    await fs.ensureDir(outputDir);

    // Skip re-encoding for compatible containers (mp4, mov)
    const isCopySafe = ['.mp4', '.mov', '.m4v'].includes(ext);

    const command = ffmpeg(inputPath)
      .outputOptions(isCopySafe ? [
        '-c:v copy',
        '-c:a copy',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls'
      ] : [
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-ac 2',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls'
      ])
      .output(outputM3U8)
      .on('start', cmdLine => {
        console.log(`FFmpeg started with command: ${cmdLine}`);
      })
      .on('end', async () => {
        console.log('✅ FFmpeg finished conversion');
        await fs.unlink(inputPath); // Clean up original file
        const streamPath = `/videos/${filename}/index.m3u8`;
        console.log(`Sending stream path to frontend: ${streamPath}`);
        res.json({ streamUrl: streamPath });
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        res.status(500).json({ error: 'Video conversion failed' });
      });

    command.run();

  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Serve converted HLS videos
app.use('/videos', express.static(VIDEOS_DIR));

// Health check
app.get('/', (_req, res) => {
  res.send('✅ Video upload backend is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
