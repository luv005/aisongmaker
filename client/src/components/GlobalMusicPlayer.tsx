import React, { useState, useEffect } from 'react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Repeat } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export function GlobalMusicPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlayPause,
    seek,
    setVolume,
    next,
    previous,
    close,
  } = useAudioPlayer();

  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);

  // Don't render if no track is loaded
  if (!currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seek(value[0]);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleClose = () => {
    close();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 px-4 py-3">
      <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {currentTrack.thumbnailUrl ? (
            <img
              src={currentTrack.thumbnailUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded bg-gradient-to-br from-purple-500 to-purple-700 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-medium truncate text-sm">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={previous}
              className="hover:text-foreground transition-colors text-muted-foreground"
              aria-label="Previous"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </button>

            <button
              onClick={next}
              className="hover:text-foreground transition-colors text-muted-foreground"
              aria-label="Next"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <button
              className="hover:text-foreground transition-colors text-muted-foreground"
              aria-label="Repeat"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground tabular-nums min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume and Close */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="hover:text-foreground transition-colors text-muted-foreground"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>

          <button
            onClick={handleClose}
            className="hover:text-foreground transition-colors text-muted-foreground"
            aria-label="Close player"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

