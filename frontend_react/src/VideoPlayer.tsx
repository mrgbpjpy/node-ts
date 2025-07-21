import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Dispose previous instance
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    // Wait for next tick to ensure it's in the DOM
    setTimeout(() => {
      if (videoElement && document.body.contains(videoElement)) {
        playerRef.current = videojs(videoElement, {
          controls: true,
          autoplay: false,
          preload: 'auto',
          fluid: true,
          poster,
          sources: [{ src, type: 'application/x-mpegURL' }], // correct MIME for .m3u8
        });
      }
    }, 0);

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, poster]);

  return (
    <div data-vjs-player>
      <video
        ref={videoRef}
        className="video-js vjs-big-play-centered"
        playsInline
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default VideoPlayer;
