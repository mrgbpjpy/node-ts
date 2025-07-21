import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve videos and thumbnails
app.use("/videos", express.static(path.join(__dirname, "videos")));
app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails")));

// Multer setup
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("video"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name;
  const videoDir = path.join(__dirname, "videos", baseName);
  const outputPath = path.join(videoDir, "index.m3u8");
  const thumbnailDir = path.join(__dirname, "thumbnails");
  const thumbnailPath = path.join(thumbnailDir, `${baseName}.jpg`);

  try {
    // Create output folders if they don't exist
    fs.mkdirSync(videoDir, { recursive: true });
    fs.mkdirSync(thumbnailDir, { recursive: true });

    // FFmpeg command to generate HLS stream
    const ffmpegProcess = spawn("ffmpeg", [
      "-i", inputPath,
      "-vf", "scale=1280:-2",
      "-c:v", "libx264",
      "-profile:v", "main",
      "-crf", "20",
      "-sc_threshold", "0",
      "-g", "48",
      "-keyint_min", "48",
      "-c:a", "aac",
      "-ar", "48000",
      "-b:a", "128k",
      "-hls_time", "10",
      "-hls_playlist_type", "vod",
      "-f", "hls",
      outputPath,
    ]);

    ffmpegProcess.stderr.on("data", (data) => {
      console.error("❌ FFmpeg stderr:", data.toString());
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: "FFmpeg execution error" });
      }

      // After HLS generation, generate thumbnail
      const thumbProcess = spawn("ffmpeg", [
        "-i", inputPath,
        "-ss", "00:00:01.000",
        "-vframes", "1",
        "-vf", "scale=1280:-1",
        "-q:v", "2",
        "-pix_fmt", "yuv420p",
        thumbnailPath,
      ]);

      thumbProcess.stderr.on("data", (data) => {
        console.error("❌ Thumbnail stderr:", data.toString());
      });

      thumbProcess.on("close", (thumbCode) => {
        if (thumbCode !== 0) {
          return res.status(500).json({ error: "Thumbnail generation failed" });
        }

        // Success
        return res.status(200).json({
          message: "Upload and processing complete",
          streamUrl: `/videos/${baseName}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseName}.jpg`,
        });
      });
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
