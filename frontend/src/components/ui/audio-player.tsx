import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from './button';
import { API_ENDPOINTS } from "@/lib/config";

interface AudioPlayerProps {
  audioPath: string;
  duration?: number;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioPath, 
  duration, 
  className = '' 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioUrl = audioPath ? `${API_ENDPOINTS.AUDIO_BASE}/${audioPath.split('/').pop()}` : '';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  if (!audioPath) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-red-100 rounded-lg text-red-700 ${className}`}>
        <Volume2 className="h-4 w-4" />
        <span className="text-sm">Áudio não disponível</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-100 rounded-lg max-w-sm ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <Button
        onClick={togglePlayPause}
        disabled={isLoading}
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-600" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Volume2 className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-600">Mensagem de áudio</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <span className="text-xs text-gray-500 font-mono">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}; 