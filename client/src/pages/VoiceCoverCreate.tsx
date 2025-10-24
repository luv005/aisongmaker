import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, Heart, Users, Share2, Youtube, Loader2, Search, Download, ThumbsUp, Headphones, MoreVertical, Mic2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export default function VoiceCoverCreate() {
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = (audioUrl: string, fileName: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(fileName || 'ai-cover.mp3')}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = fileName || 'ai-cover.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePlay = (cover: any) => {
    if (currentTrack?.id === cover.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: cover.id,
        title: cover.songTitle || 'Untitled Cover',
        artist: cover.voiceModelName,
        audioUrl: cover.convertedAudioUrl,
        duration: cover.duration,
      });
    }
  };

  const { voiceId } = useParams();
  const [, setLocation] = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { isAuthenticated } = useAuth();

  const { data: voice } = trpc.voiceCover.getVoiceById.useQuery({
    id: voiceId || "",
  });

  // Fetch user's voice covers with polling for processing covers
  const { data: userCovers = [], isLoading: coversLoading } = trpc.voiceCover.getUserCovers.useQuery(
    undefined,
    {
      refetchInterval: query => {
        const covers = query.state.data;
        if (!Array.isArray(covers)) return false;
        return covers.some(
          cover => cover.status === "processing"
        )
          ? 5000
          : false;
      },
      refetchOnWindowFocus: false,
    }
  );

  const utils = trpc.useUtils();

  // Use the voice's demo audio URL from database, fallback to SoundHelix if not available
  const demoAudioUrl = voice?.demoAudioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  const handlePlayDemo = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(demoAudioUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const [coverId, setCoverId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  // Poll for cover status
  const { data: coverStatus } = trpc.voiceCover.getById.useQuery(
    { id: coverId || "" },
    {
      enabled: !!coverId,
      refetchInterval: pollingInterval || false,
    }
  );

  // Handle status updates
  if (coverStatus && coverId) {
    if (coverStatus.status === "completed" && pollingInterval) {
      setPollingInterval(null);
      setIsCreating(false);
      toast.success("Voice cover created successfully!");
      // Show audio player or download link
      if (coverStatus.convertedAudioUrl) {
        // Could play the audio or show download button
        console.log("Cover ready:", coverStatus.convertedAudioUrl);
      }
    } else if (coverStatus.status === "failed" && pollingInterval) {
      setPollingInterval(null);
      setIsCreating(false);
      toast.error("Failed to create voice cover. Please try again.");
    }
  }

  const createCover = trpc.voiceCover.create.useMutation({
    onSuccess: (data) => {
      if (data.success && data.id) {
        setCoverId(data.id);
        setPollingInterval(2000); // Poll every 2 seconds
        toast.success("AI Cover generation started! You can refresh or close this page.");
        utils.voiceCover.getUserCovers.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`Failed to start generation: ${error.message}`);
      setIsCreating(false);
    },
  });

  const uploadAudio = trpc.upload.uploadAudio.useMutation();

  const handleCreate = async () => {
    if (!youtubeUrl && !audioFile) {
      toast.error("Please provide a YouTube link or upload an audio file");
      return;
    }

    if (!voice) {
      toast.error("Voice model not found");
      return;
    }

    setIsCreating(true);

    try {
      let audioUrl: string;

      if (audioFile) {
        // Upload file to S3
        toast.info("Uploading audio file...");
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioFile);
        });

        const uploadResult = await uploadAudio.mutateAsync({
          fileName: audioFile.name,
          fileData,
          contentType: audioFile.type,
        });

        audioUrl = uploadResult.url;
        toast.success("File uploaded successfully!");
      } else {
        // Use YouTube URL directly
        audioUrl = youtubeUrl;
      }

      // Create voice cover
      createCover.mutate({
        voiceModelId: voice.id,
        audioUrl,
        pitchChange: "no-change",
      });
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsCreating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }

      // Check file type
      const validTypes = [
        "audio/wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/m4a",
        "audio/ogg",
        "audio/flac",
        "audio/aac",
        "audio/aiff",
        "audio/opus",
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|m4a|ogg|flac|aac|aiff|opus|oga)$/i)) {
        toast.error("Invalid file type. Supported: Wav, Mp3, M4a, Ogg, Flac, Aac, Aiff, Opus, Oga");
        return;
      }

      setAudioFile(file);
      setYoutubeUrl(""); // Clear YouTube URL if file is selected
    }
  };

  if (!voice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Voice model not found</p>
          <Button onClick={() => setLocation("/ai-cover")}>
            Back to AI Cover
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/ai-cover")}
            className="mb-4"
          >
            ← Back to All Voices
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Voice Cover Creation */}
        <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Voice Profile */}
          <div>
            <Card className="overflow-hidden border-border/40">
              <div className="relative aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-8xl">🎤</div>
                </div>
                <button
                  onClick={handlePlayDemo}
                  className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center group"
                >
                  <div className="bg-white/90 rounded-full p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPlaying ? (
                      <div className="h-8 w-8 flex items-center justify-center">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-8 bg-green-500 animate-pulse"></div>
                          <div className="w-1.5 h-8 bg-green-500 animate-pulse" style={{animationDelay: "0.2s"}}></div>
                          <div className="w-1.5 h-8 bg-green-500 animate-pulse" style={{animationDelay: "0.4s"}}></div>
                        </div>
                      </div>
                    ) : (
                      <svg className="h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {voice.name} AI Voice
                </h2>
                <div className="inline-block bg-green-500/20 text-green-500 text-xs px-3 py-1 rounded-full mb-4">
                  {voice.category}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{(voice.uses / 1000).toFixed(1)}K Uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    <span>{voice.likes} Likes</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </Card>
          </div>

          {/* Creation Form */}
          <div className="space-y-6">
            {/* YouTube Link Input */}
            <Card className="p-6 border-green-500/30 bg-card/50">
              <div className="flex items-center gap-2 mb-4">
                <Youtube className="h-5 w-5 text-red-500" />
                <Label className="text-lg font-semibold">
                  Paste A YouTube Link
                </Label>
              </div>
              <Input
                placeholder="No More Than 7 Minutes"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setAudioFile(null); // Clear file if URL is entered
                }}
                disabled={!!audioFile}
                className="bg-background/50"
              />
            </Card>

            {/* File Upload */}
            <Card className="p-6 border-border/40 bg-card/50">
              <div className="text-center">
                <Label className="text-lg font-semibold text-green-500 mb-4 block">
                  Or Drop An Audio File
                </Label>
                <p className="text-sm text-muted-foreground mb-6">
                  No More Than 20MB. Support Wav, Mp3, M4a, Ogg, Flac, Aac, Aiff, Opus, Oga
                </p>
                <div className="border-2 border-dashed border-border/40 rounded-lg p-12 hover:border-green-500/50 transition-colors">
                  <input
                    type="file"
                    id="audio-upload"
                    accept=".wav,.mp3,.m4a,.ogg,.flac,.aac,.aiff,.opus,.oga"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={!!youtubeUrl}
                  />
                  <label
                    htmlFor="audio-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    {audioFile ? (
                      <div className="text-foreground">
                        <p className="font-semibold">{audioFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                    )}
                  </label>
                </div>
              </div>
            </Card>

            {/* Create Button */}
            <Button
              onClick={handleCreate}
              disabled={isCreating || (!youtubeUrl && !audioFile)}
              className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 text-white"
            >
              <span className="mr-2">🎵</span>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            FAQ - {voice.name} AI Voice
          </h3>
          <div className="space-y-4">
            <Card className="p-4 border-border/40 bg-card/50">
              <h4 className="font-semibold text-foreground mb-2">
                How does AI voice cover work?
              </h4>
              <p className="text-sm text-muted-foreground">
                Our AI technology analyzes the uploaded audio and converts the vocals
                to sound like {voice.name} while preserving the melody, lyrics, and
                instrumentals.
              </p>
            </Card>
            <Card className="p-4 border-border/40 bg-card/50">
              <h4 className="font-semibold text-foreground mb-2">
                What audio formats are supported?
              </h4>
              <p className="text-sm text-muted-foreground">
                We support Wav, Mp3, M4a, Ogg, Flac, Aac, Aiff, Opus, and Oga formats
                with a maximum file size of 20MB.
              </p>
            </Card>
            <Card className="p-4 border-border/40 bg-card/50">
              <h4 className="font-semibold text-foreground mb-2">
                How long does it take to create a cover?
              </h4>
              <p className="text-sm text-muted-foreground">
                Processing typically takes 2-5 seconds for a 30-second audio clip,
                depending on the length of your input.
              </p>
            </Card>
          </div>
        </div>
        </div>
        </div>

        {/* Right Panel - Voice Covers History */}
        <div className="w-96 border-l border-border overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by song name, voice"
                className="pl-10 bg-background"
              />
            </div>
          </div>

          {coversLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : userCovers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No AI covers created yet</p>
              <p className="text-xs mt-1">Create your first cover!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userCovers.map((cover: any) => (
                <Card
                  key={cover.id}
                  className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail with duration overlay */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Mic2 className="h-8 w-8 text-white/80" />
                      </div>
                      {cover.status === "completed" && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded">
                          {formatDuration(cover.duration)}
                        </div>
                      )}
                      {cover.status === "processing" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      {cover.status === "completed" && cover.convertedAudioUrl && (
                        <button
                          onClick={() => handlePlay(cover)}
                          className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
                        >
                          {currentTrack?.id === cover.id && isPlaying ? (
                            <Pause className="h-8 w-8 text-white drop-shadow-lg" />
                          ) : (
                            <Play className="h-8 w-8 text-white drop-shadow-lg" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-medium truncate text-sm mb-1">
                          {cover.songTitle || "Untitled Cover"}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {cover.voiceModelName}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch checked={false} className="scale-75" />
                          <span className="text-xs text-muted-foreground">Publish</span>
                        </div>

                        {cover.status === "completed" && cover.convertedAudioUrl ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <button 
                              onClick={() => handleDownload(cover.convertedAudioUrl, `${cover.songTitle || 'Untitled Cover'} (${cover.voiceModelName}).mp3`)}
                              className="hover:text-foreground transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handlePlay(cover)}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              <Headphones className="h-4 w-4" />
                              <span className="text-xs">0</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-xs">0</span>
                            </button>
                            <button className="hover:text-foreground transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        ) : cover.status === "failed" ? (
                          <div className="text-xs text-destructive font-medium">Generation failed</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

