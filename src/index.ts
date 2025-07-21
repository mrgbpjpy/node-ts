import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream';
import Busboy from 'busboy';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const PORT = process.env.PORT || 5000;

const ensureDirs = ['uploads', 'videos', 'thumbnails', 'public'];
ensureDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('[LOG] Created folder:', fullPath);
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

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

app.post('/upload', (req: Request, res: Response) => {
  const busboy = new Busboy({ headers: req.headers });
  let filePath = '';
  let fileName = '';
  let outputDir = '';
  let thumbnailPath = '';

  busboy.on('file', (_fieldname, file, filename) => {
    fileName = path.parse(filename).name.replace(/\s+/g, '_');
    filePath = path.join(__dirname, 'uploads', `${fileName}.mp4`);
    outputDir = path.join(__dirname, 'videos', fileName);
    thumbnailPath = path.join(__dirname, 'thumbnails', `${fileName}.jpg`);

    const writeStream = fs.createWriteStream(filePath);
    file.pipe(writeStream);
  });

  busboy.on('finish', () => {
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

  req.pipe(busboy);
});

app.listen(PORT, () => {
  console.log(`[LOG] Backend running at http://localhost:${PORT}`);
});