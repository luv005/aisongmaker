import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Download, Share2, MoreVertical, Headphones, ThumbsUp, ListMusic, Sparkles, Settings, Play, Pause, Music } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import MusicSettings, { MusicSettingsData } from "@/components/MusicSettings";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [musicSettings, setMusicSettings] = useState<MusicSettingsData>({
    style: "",
    mood: "",
    scenario: "",
  });
  const [customMode, setCustomMode] = useState(true);
  const [instrumental, setInstrumental] = useState(false);
  const [gender, setGender] = useState<"m" | "f" | "random">("random");
  const [activeTab, setActiveTab] = useState<"lyrics" | "description" | "audio">("lyrics");
  const [showStructureMenu, setShowStructureMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [description, setDescription] = useState("");

  const generateMutation = trpc.music.generate.useMutation({
    onSuccess: () => {
      toast.success("Music generation started!");
      setPrompt("");
      setMusicSettings({ style: "", mood: "", scenario: "" });
      utils.music.getHistory.invalidate();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate music");
    },
  });

  const { data: history = [], isLoading: historyLoading } = trpc.music.getHistory.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      refetchInterval: query => {
        const tracks = query.state.data;
        if (!Array.isArray(tracks)) return false;
        return tracks.some(
          track => track.status === "pending" || track.status === "processing"
        )
          ? 5000
          : false;
      },
      refetchOnWindowFocus: false,
    }
  );

  const utils = trpc.useUtils();

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: track.id,
        title: track.title || 'Untitled',
        artist: 'AI Music',
        audioUrl: track.audioUrl,
        thumbnailUrl: track.imageUrl,
      });
    }
  };

  const handleGenerate = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (selectedSettings.length === 0) {
      toast.error("Please select at least one setting (Style, Mood, or Scenario)");
      return;
    }

    // Description mode: generate lyrics from description first
    if (activeTab === "description") {
      if (!description.trim()) {
        toast.error("Please enter a song description");
        return;
      }

      const songTitle = title || description.split(" ").slice(0, 5).join(" ") || "Untitled";

      generateMutation.mutate({
        description: description,
        title: songTitle,
        style: selectedSettings.join(", "),
        model: "V5",
        customMode,
        instrumental,
        gender,
      });
      return;
    }

    // Lyrics mode: use provided lyrics
    if (!prompt && !instrumental) {
      toast.error("Please enter lyrics");
      return;
    }

    const songTitle = title || prompt.split("\\n")[0].substring(0, 50) || "Untitled";

    generateMutation.mutate({
      prompt: prompt || "",
      title: songTitle,
      style: selectedSettings.join(", "),
      model: "V5",
      customMode,
      instrumental,
      gender,
    });
  };

  const songStructures = [
    "Intro",
    "Verse",
    "Pre-Chorus",
    "Chorus",
    "Break",
    "Bridge",
    "Outro",
  ];

  const generateLyricsMutation = trpc.music.generateLyrics.useMutation({
    onSuccess: (data) => {
      setPrompt(data.lyrics);
      if (data.title && !title) {
        setTitle(data.title);
      }
      toast.success("Lyrics generated!");
    },
    onError: () => {
      toast.error("Failed to generate lyrics");
    },
  });

  const handleGenerateLyrics = async () => {
    const selectedSettings = [musicSettings.style, musicSettings.mood, musicSettings.scenario]
      .filter(Boolean);

    if (selectedSettings.length === 0) {
      toast.error("Please select at least one setting first");
      return;
    }

    setIsGeneratingLyrics(true);
    try {
      await generateLyricsMutation.mutateAsync({
        style: selectedSettings.join(", "),
        title: title || undefined,
      });
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const insertStructure = (structure: string) => {
    const tag = `[${structure}]\\n`;
    setPrompt((prev) => prev + tag);
    setShowStructureMenu(false);
  };

  const handleSettingsConfirm = (settings: MusicSettingsData) => {
    setMusicSettings(settings);
  };

  const handleDownload = (audioUrl: string, fileName: string) => {
    const proxyUrl = `/api/download?url=${encodeURIComponent(audioUrl)}&filename=${encodeURIComponent(fileName)}`;
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async (trackId: string, title: string) => {
    const shareUrl = `${window.location.origin}/song/${trackId}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: title || "My Song",
          text: `Check out my song "${title || "My Song"}" created with AI!`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Error sharing:", err);
        toast.error("Failed to share");
      }
    }
  };

  const getSettingsSummary = () => {
    const parts = [musicSettings.style, musicSettings.mood, musicSettings.scenario].filter(Boolean);
    if (parts.length === 0) return "Select music settings";
    return parts.join(", ");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "lyrics"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("lyrics")}
          >
            Lyrics
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "description"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("description")}
          >
            Description
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "audio"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("audio")}
          >
            Audio
            <Badge className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0">NEW</Badge>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            MiniMax Music-1.5
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Music Creation */}
        <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
          {/* Settings, Instrumental, Title - Hidden in Description tab */}
          {activeTab !== "description" && (
            <>
              {/* Settings Button */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  Settings
                </Label>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left h-auto py-3"
                  onClick={() => setSettingsOpen(true)}
                >
                  <span className="text-sm text-muted-foreground truncate">
                    {getSettingsSummary()}
                  </span>
                  <Settings className="h-4 w-4 ml-2 flex-shrink-0" />
                </Button>
                {(musicSettings.style || musicSettings.mood || musicSettings.scenario) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {musicSettings.style && (
                      <Badge variant="secondary">{musicSettings.style}</Badge>
                    )}
                    {musicSettings.mood && (
                      <Badge variant="secondary">{musicSettings.mood}</Badge>
                    )}
                    {musicSettings.scenario && (
                      <Badge variant="secondary">{musicSettings.scenario}</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Instrumental Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="instrumental" className="text-sm font-medium">
                  Instrumental
                </Label>
                <Switch
                  id="instrumental"
                  checked={instrumental}
                  onCheckedChange={setInstrumental}
                />
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium mb-2 block">
                  Title (Optional)
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your title"
                  maxLength={80}
                  className="bg-background"
                />
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {title.length} / 80
                </div>
              </div>
            </>
          )}

          {/* Lyrics Tab */}
          {activeTab === "lyrics" && (
            <div>
              <Label htmlFor="lyrics" className="text-sm font-medium mb-2 block">
                Lyrics
              </Label>
              <Textarea
                id="lyrics"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter lyrics of your music or try to get inspired"
                className="min-h-[300px] bg-background resize-none"
                maxLength={3000}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {prompt.length} / 3000
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLyrics}
                  disabled={isGeneratingLyrics || generateLyricsMutation.isPending}
                  className="bg-primary/10 border-primary/20 hover:bg-primary/20"
                >
                  {isGeneratingLyrics || generateLyricsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Write Lyrics For Me
                    </>
                  )}
                </Button>

                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStructureMenu(!showStructureMenu)}
                  >
                    <ListMusic className="h-4 w-4" />
                  </Button>
                  {showStructureMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-10 min-w-[150px]">
                      {songStructures.map((structure) => (
                        <button
                          key={structure}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                          onClick={() => insertStructure(structure)}
                        >
                          {structure}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description Tab */}
          {activeTab === "description" && (
            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-2 block">
                Song Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the song you want to create, e.g., 'make a song about a special person in your life with instrumental bluegrass'"
                className="min-h-[300px] bg-background resize-none"
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {description.length} / 500
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="bg-primary/10 border-primary/20"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Inspired
                </Button>
              </div>
            </div>
          )}

          {/* Audio Tab - Placeholder */}
          {activeTab === "audio" && (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Audio upload coming soon</p>
            </div>
          )}

          {/* Gender - Hidden in Description tab */}
          {activeTab !== "description" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Gender</Label>
              <div className="flex gap-2">
                <Button
                  variant={gender === "m" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGender("m")}
                  className="flex-1"
                >
                  Male
                </Button>
                <Button
                  variant={gender === "f" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGender("f")}
                  className="flex-1"
                >
                  Female
                </Button>
                <Button
                  variant={gender === "random" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGender("random")}
                  className="flex-1"
                >
                  Random
                </Button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-medium"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>

        {/* Right Panel - Music History */}
        <div className="w-96 border-l border-border overflow-y-auto p-6 pb-24">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by song name, style"
                className="pl-10 bg-background"
              />
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No music generated yet</p>
              <p className="text-xs mt-1">Create your first song!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((track: any) => (
                <Card
                  key={track.id}
                  className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                  onClick={() => track.status === "completed" && setLocation(`/song/${track.id}`)}
                >
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail with duration overlay */}
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      {track.imageUrl ? (
                        <img
                          src={track.imageUrl}
                          alt={track.title || "Song artwork"}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <div
                            className="absolute inset-0"
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Music className="h-8 w-8 text-white/80" />
                          </div>
                        </>
                      )}
                      {track.status === "completed" && track.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded">
                          {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                        </div>
                      )}
                      {track.status === "processing" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      {track.status === "completed" && track.audioUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlay(track);
                          }}
                          className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
                        >
                          {currentTrack?.id === track.id && isPlaying ? (
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
                        <h4 className="font-medium truncate text-sm">
                          {track.title || "Untitled"}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Status Indicator */}
                        {track.status === "pending" || track.status === "processing" ? (
                          <Badge variant="outline" className="text-xs">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            {track.status === "pending" ? "Pending" : "Generating..."}
                          </Badge>
                        ) : track.status === "failed" ? (
                          <Badge variant="destructive" className="text-xs">Failed</Badge>
                        ) : null}

                        {track.status === "completed" && track.audioUrl ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(track.audioUrl!, `${track.title || 'Untitled'}.mp3`);
                              }}
                              className="hover:text-foreground transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(track.id, track.title || 'Untitled');
                              }}
                              className="hover:text-foreground transition-colors"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlay(track);
                              }}
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
                        ) : track.status === "failed" ? (
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

      {/* Music Settings Dialog */}
      <MusicSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onConfirm={handleSettingsConfirm}
        initialSettings={musicSettings}
      />
    </div>
  );
}
