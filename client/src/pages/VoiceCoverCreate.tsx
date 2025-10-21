import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Heart, Users, Share2, Youtube } from "lucide-react";
import { toast } from "sonner";

export default function VoiceCoverCreate() {
  const { voiceId } = useParams();
  const [, setLocation] = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const demoAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

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

  const { data: voice } = trpc.voiceCover.getVoiceById.useQuery({
    id: voiceId || "",
  });

  const createCover = trpc.voiceCover.create.useMutation({
    onSuccess: (data) => {
      toast.success("Voice cover created successfully!");
      setIsCreating(false);
      // Could navigate to a results page or show the audio player
    },
    onError: (error) => {
      toast.error(`Failed to create cover: ${error.message}`);
      setIsCreating(false);
    },
  });

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

    // For now, we'll use a placeholder URL
    // In production, you'd upload the file to S3 first or process the YouTube URL
    const audioUrl = audioFile
      ? URL.createObjectURL(audioFile)
      : youtubeUrl;

    createCover.mutate({
      voiceModelId: voice.id,
      audioUrl,
      pitchChange: "no-change",
    });
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
    <div className="min-h-screen bg-background">
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

      <div className="container py-8 max-w-5xl">
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
  );
}

