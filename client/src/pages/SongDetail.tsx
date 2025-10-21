import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Download,
  Share2,
  ThumbsUp,
  ListMusic,
  X,
  Volume2,
  VolumeX
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [isVolumePopoverOpen, setIsVolumePopoverOpen] = useState(false);

  const { data: song, isLoading } = trpc.music.getById.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  const ensureAudioReady = () => {
    const audio = audioRef.current;
    if (!audio || !song?.audioUrl) return null;
    if (!audio.src || audio.src !== song.audioUrl) {
      audio.src = song.audioUrl;
      audio.load();
    }
    return audio;
  };

  useEffect(() => {
    const audio = ensureAudioReady();
    if (!audio || !song?.audioUrl) return;

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    let frameId: number | null = null;

    const syncTime = () => {
      setCurrentTime(audio.currentTime);
      frameId = requestAnimationFrame(syncTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(syncTime);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      handlePause();
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    // Force load metadata
    if (audio.readyState >= 1) {
      updateDuration();
    }
    if (!audio.paused) {
      handlePlay();
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [song?.audioUrl]);

  const togglePlay = () => {
    const audio = ensureAudioReady();
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch((err) => {
        console.error("Failed to play audio:", err);
      });
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const vol = parseFloat(e.target.value);
    audio.volume = vol;
    setVolume(vol);
    if (vol > 0) {
      setPreviousVolume(vol);
    }
  };

  const toggleMute = () => {
    const audio = ensureAudioReady();
    if (!audio) return;

    if (volume === 0) {
      const restored = previousVolume || 1;
      audio.volume = restored;
      setVolume(restored);
    } else {
      setPreviousVolume(volume);
      audio.volume = 0;
      setVolume(0);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = () => {
    if (!song?.audioUrl) return;
    
    const link = document.createElement("a");
    link.href = song.audioUrl;
    link.download = `${song.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!song) return;
    
    const shareData = {
      title: song.title || "My Song",
      text: `Check out my song "${song.title || "My Song"}" created with AI!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime =
    safeDuration > 0 ? Math.min(currentTime, safeDuration) : currentTime;
  const progressPercent =
    safeDuration > 0 ? Math.min(100, (safeCurrentTime / safeDuration) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground">Song not found</div>
      </div>
    );
  }

  // Generate colorful gradient for album art
  const gradients = [
    "from-purple-500 via-pink-500 to-red-500",
    "from-blue-500 via-purple-500 to-pink-500",
    "from-green-500 via-teal-500 to-blue-500",
    "from-yellow-500 via-orange-500 to-red-500",
    "from-indigo-500 via-purple-500 to-pink-500",
  ];
  const gradientIndex = song.id.charCodeAt(0) % gradients.length;
  const gradient = gradients[gradientIndex];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="mb-6"
          >
            <X className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-8 mb-8">
            {/* Album Art */}
            <div className="relative w-72 h-72 flex-shrink-0">
              <div className={`w-full h-full bg-gradient-to-br ${gradient} rounded-lg shadow-2xl flex items-center justify-center`}>
                <ListMusic className="h-24 w-24 text-white/80" />
              </div>
              <button className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors">
                <ThumbsUp className="h-5 w-5" />
              </button>
              <span className="absolute bottom-4 left-16 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                0
              </span>
            </div>

            {/* Song Info */}
            <div className="flex-1">
              <h1 className="text-5xl font-bold mb-4">{song.title}</h1>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {user?.name?.[0] || "U"}
                  </div>
                  <span className="text-lg">{user?.name || "Unknown"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                <span>{new Date(song.createdAt!).toLocaleDateString()}</span>
                <span>•</span>
                <span className="bg-primary/20 text-primary px-2 py-1 rounded">{song.model}</span>
              </div>

              {song.style && (
                <div className="mb-6">
                  <span className="text-sm text-muted-foreground">Style: </span>
                  <span className="text-sm">{song.style}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  size="lg"
                  onClick={togglePlay}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play
                    </>
                  )}
                </Button>
                <Button variant="outline" size="lg" onClick={handleDownload}>
                  <Download className="h-5 w-5 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare}>
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>

          {/* Lyrics */}
          {song.prompt && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Lyrics</h2>
              <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {song.prompt}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Player */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            {/* Song Info */}
            <div className="flex items-center gap-4 w-64">
              <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded flex items-center justify-center flex-shrink-0`}>
                <ListMusic className="h-6 w-6 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{song.title}</div>
                <div className="text-sm text-muted-foreground truncate">{user?.name || "Unknown"}</div>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={togglePlay}
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 p-0"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Repeat className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3 w-full max-w-2xl">
                <span className="text-xs text-muted-foreground w-12 text-right font-medium">
                  {formatTime(safeCurrentTime)}
                </span>
                <div className="flex-1 group relative">
                  <input
                    type="range"
                    min="0"
                    max={safeDuration}
                    value={safeDuration ? safeCurrentTime : 0}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer transition-all hover:h-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
                    style={{
                      background: `linear-gradient(to right, #22c55e 0%, #22c55e ${progressPercent}%, hsl(var(--border)) ${progressPercent}%, hsl(var(--border)) 100%)`
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 font-medium">
                  {formatTime(safeDuration || duration)}
                </span>
              </div>
            </div>

            {/* Volume Control */}
            <Popover open={isVolumePopoverOpen} onOpenChange={setIsVolumePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Adjust volume"
                >
                  {volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-48">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="rounded-full border border-border p-1 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                    aria-label={volume === 0 ? "Unmute" : "Mute"}
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1.5 bg-border rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                    style={{
                      background: `linear-gradient(to right, #22c55e 0%, #22c55e ${volume * 100}%, hsl(var(--border)) ${volume * 100}%, hsl(var(--border)) 100%)`
                    }}
                  />
                  <span className="text-xs w-10 text-right font-medium">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </PopoverContent>
            </Popover>

            {/* More Options */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ListMusic className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Audio Element */}
      {song.audioUrl && (
        <audio ref={audioRef} src={song.audioUrl} preload="metadata" />
      )}
    </div>
  );
}
