import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { IncomingHttpHeaders } from 'http';

// ✅ CommonJS-style import required for proper typing
const Busboy = require('busboy');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Ensure required folders exist
const ensureDirs = ['uploads', 'videos', 'thumbnails', 'public'];
ensureDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('[LOG] Created folder:', fullPath);
  }
});

// ✅ CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());

// ✅ Static routes
app.use(express.static(path.join(__dirname, 'public')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// ✅ Root route
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Prime Video Backend</title></head>
      <body style="font-family:sans-serif;padding:40px;">
        <h1>Prime Video Backend</h1>
        <p>POST a video file to <code>/upload</code> for HLS conversion.</p>
      </body>
    </html>
  `);
});

// ✅ Upload route with full typings
app.post('/upload', (req: Request, res: Response) => {
  const bb = new Busboy({ headers: req.headers as IncomingHttpHeaders });

  let filePath = '';
  let fileName = '';
  let outputDir = '';

  bb.on('file', (
    fieldname: string,
    file: NodeJS.ReadableStream,
    filename: string
  ) => {
    fileName = path.parse(filename).name.replace(/\s+/g, '_');
    filePath = path.join(__dirname, 'uploads', `${fileName}.mp4`);
    outputDir = path.join(__dirname, 'videos', fileName);

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
          })
          .on('error', (thumbErr: Error) => {
            console.error('[ERROR] Thumbnail generation failed:', thumbErr);
            res.status(500).json({ error: 'Thumbnail generation failed' });
          });
      })
      .on('error', (err: Error) => {
        console.error('[ERROR] FFmpeg HLS conversion failed:', err);
        res.status(500).json({ error: 'FFmpeg processing failed' });
      })
      .run();
  });

  req.pipe(bb);
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`[LOG] Backend running at http://localhost:${PORT}`);
});

// ✅ Export for testing
export { app };
