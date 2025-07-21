import React, { useState } from 'react';
import VideoPlayer from './VideoPlayer';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadKey, setUploadKey] = useState(0);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setVideoUrl('');
    setThumbnailUrl('');
    setUploadKey(prev => prev + 1);
    setStatus('Uploading...');
    setProgress(0);
    setUploading(true);

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload`, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onloadstart = () => {
      setStatus('Uploading...');
      setUploading(true);
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setStatus('Converting...');
        setProgress(100);
        const data = JSON.parse(xhr.responseText);

        setTimeout(() => {
          setVideoUrl(`${API_BASE_URL}${data.streamUrl}`);
          setThumbnailUrl(`${API_BASE_URL}${data.thumbnailUrl}`);
          setStatus('✅ Done');
          setUploading(false);
        }, 1500); // Simulated conversion time
      } else {
        setStatus('❌ Upload failed');
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setStatus('❌ Upload error');
      setUploading(false);
    };

    xhr.send(formData);
  };

  return (
    <div className="App">
      <h1>🎬 Prime Video Player Demo</h1>
      <input type="file" accept="video/*" onChange={handleUpload} />

      {uploading && (
        <div className="spinner-container">
          <p>{status}</p>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
              {progress}%
            </div>
          </div>
        </div>
      )}

      {!uploading && videoUrl && (
        <div className="video-wrapper">
          <VideoPlayer key={uploadKey} src={videoUrl} poster={thumbnailUrl} />
        </div>
      )}
    </div>
  );
}

export default App;
