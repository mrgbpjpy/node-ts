# 📦 Prime Video Player - Full Stack App

Live project [Prime Video Player ](https://frontend-mu-two-39.vercel.app/)

This project is a full-stack web application that allows users to:

- Upload a video file
- Convert it into HLS format using FFmpeg
- Generate a thumbnail
- Stream the video in the frontend using HLS.js

---

## 🧱 Tech Stack

- **Frontend:** React + TypeScript + HLS.js
- **Backend:** Node.js + Express + TypeScript
- **Media Processing:** FFmpeg
- **Deployment:** Railway (backend), Vercel (frontend recommended)

---

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── index.ts         # Express app
│   │   └── dev.ts           # Optional local dev launcher
│   └── dist/                # Compiled output after `npm run build`
├── frontend/
│   ├── src/App.tsx          # React uploader + video player
│   └── .env                 # Set REACT_APP_BACKEND_URL
```

---

## 🚀 Backend Setup (Railway)

### 1. Prerequisites

- [Railway account](https://railway.app/)
- `ffmpeg` must be installed on the container or included in `Dockerfile`
- Node.js 18+ with TypeScript

### 2. Key Backend Features

- `/upload` POST endpoint accepts a video file
- Converts to HLS format (`.m3u8` and `.ts` files)
- Generates a thumbnail preview (`.jpg`)
- Serves streams via `/videos/{video}/index.m3u8`
- Serves thumbnails via `/thumbnails/{video}.jpg`

### 3. Build & Run

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run compiled server
npm start
```

### 4. FFmpeg Requirement

Ensure `ffmpeg` is available in your Railway environment.

To debug:

```bash
ffmpeg -version
```

---

## 🎬 Frontend Setup (React + HLS.js)

### 1. Features

- Drag-and-drop or file upload
- Displays real-time upload progress
- Streams HLS video using `Hls.js`
- Shows thumbnail preview

### 2. Set Backend URL

In `frontend/.env`:

```env
REACT_APP_BACKEND_URL=https://node-ts-production.up.railway.app
```

> ✅ Make sure to match the deployed backend domain on Railway.

### 3. Run Frontend Locally

```bash
npm install
npm start
```

### 4. Deploy Frontend (Optional)

Recommended: [Vercel](https://vercel.com/)

Make sure to set `REACT_APP_BACKEND_URL` in the **Vercel Environment Variables**.

---

## 📡 API Example

**POST** `/upload`

- Content-Type: `multipart/form-data`
- Body: `video` field (file)

**Success Response:**

```json
{
  "message": "Upload and processing complete",
  "streamUrl": "/videos/myvideo/index.m3u8",
  "thumbnailUrl": "/thumbnails/myvideo.jpg"
}
```

---

## 🛠 Troubleshooting

- ❌ `ENOENT` → Ensure `ffmpeg` is installed
- ❌ CORS Error → Add `withCredentials: true` in frontend and `Access-Control-Allow-Origin` header in backend
- ❌ Video doesn't play → Ensure `Hls.js` is loaded and the `.m3u8` stream is publicly accessible

---

## 📸 Screenshot

> Add a screenshot of your app playing a video and showing a thumbnail.

---

## 👨‍💻 Author

**Erick Esquilin**  
Backend: Node/Express/TS + FFmpeg on Railway  
Frontend: React + HLS.js on Vercel
