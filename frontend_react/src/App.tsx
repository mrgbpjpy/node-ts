import React, { useState, useRef, useEffect } from 'react';
import axios, { AxiosProgressEvent } from 'axios';
import Hls from 'hls.js';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [streamURL, setStreamURL] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('video', selectedFile);

    setUploading(true);
    setUploadProgress(0);
    setStatus('Uploading...');

    try {
      const res = await axios.post(
        'https://prime-video-backend.onrender.com/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          }
        }
      );

      const { streamUrl } = res.data;
      setStatus('Converting...');
      pollForHLSReady(streamUrl);
    } catch (err) {
      setStatus('❌ Upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const pollForHLSReady = (url: string) => {
    const interval = setInterval(() => {
      fetch(`https://prime-video-backend.onrender.com${url}`, { method: 'HEAD' })
        .then((res) => {
          if (res.ok) {
            clearInterval(interval);
            setStatus('✅ Video is ready to watch!');
            setStreamURL(`https://prime-video-backend.onrender.com${url}`);
          }
        })
        .catch(() => {});
    }, 2000);
  };

  useEffect(() => {
    if (streamURL && videoRef.current) {
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = streamURL;
      } else if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamURL);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.ERROR, function (event, data) {
          console.error('HLS.js error:', data);
        });
      } else {
        console.warn('HLS not supported');
      }
    }
  }, [streamURL]);

  return (
    <div style={{ textAlign: 'center', paddingTop: '40px', fontFamily: 'Arial' }}>
      <h1>🎬 Prime Video Player Demo</h1>

      <input type="file" accept="video/*" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!selectedFile || uploading} style={{ marginLeft: 10 }}>
        Upload
      </button>

      {uploading && (
        <div style={{ marginTop: '20px' }}>
          <p>Uploading: {uploadProgress}%</p>
          <progress value={uploadProgress} max="100" style={{ width: '300px' }} />
        </div>
      )}

      {status && (
        <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
          <p>{status}</p>
        </div>
      )}

      {streamURL && (
        <div style={{ marginTop: '30px' }}>
          <video ref={videoRef} controls style={{ width: '100%', maxWidth: '720px' }} />
        </div>
      )}
    </div>
  );
};

export default App;
