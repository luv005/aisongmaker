import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Settings, Music } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import MusicSettings, { MusicSettingsData } from "@/components/MusicSettings";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
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
  const [activeTab, setActiveTab] = useState<"lyrics" | "description">("lyrics");
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
      // Navigate to songs page to see the result
      setLocation("/songs");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate music");
    },
  });

  const utils = trpc.useUtils();

  const handleGenerate = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    // Extract selected settings
    const selectedSettings = [
      musicSettings.style,
      musicSettings.mood,
      musicSettings.scenario,
    ].filter(Boolean);

    // Description mode: generate lyrics from description first (no settings required)
    if (activeTab === "description") {
      if (!description.trim()) {
        toast.error("Please enter a song description");
        return;
      }

      generateMutation.mutate({
        prompt: "", // Empty prompt triggers description mode
        description: description.trim(),
        title: title || undefined,
        gender,
        instrumental: false, // Description mode always has vocals
      });
      return;
    }

    // Lyrics/Audio mode: require settings
    if (selectedSettings.length === 0 && !customMode) {
      toast.error("Please select at least one music setting");
      return;
    }

    // Lyrics mode: use provided lyrics
    if (!prompt.trim()) {
      toast.error("Please enter lyrics for your song");
      return;
    }

    generateMutation.mutate({
      prompt: prompt.trim(),
      title: title || undefined,
      gender,
      instrumental,
      customMode,
      musicSettings: customMode ? undefined : musicSettings,
    });
  };

  const generateLyricsMutation = trpc.music.generateLyrics.useMutation({
    onSuccess: (data) => {
      if (data.lyrics) {
        setPrompt(data.lyrics);
      }
      toast.success("Lyrics generated!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate lyrics");
    },
  });

  const handleGenerateLyrics = async () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title to generate lyrics");
      return;
    }

    setIsGeneratingLyrics(true);
    try {
      await generateLyricsMutation.mutateAsync({
        title: title.trim(),
      });
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const scrollToGenerator = () => {
    document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background"></div>
        
        <div className="relative container max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            AI Song Maker & AI Music Generator
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            Create songs effortlessly with our AI Song Maker. Compose tracks, generate AI songs, and enjoy royalty-free music creation with ease.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white font-semibold"
            onClick={scrollToGenerator}
          >
            Try AI Song Maker & AI Music Generator For Free →
          </Button>
        </div>
      </section>

      {/* AI Song Generator Section */}
      <section id="generator" className="py-12 px-6">
        <div className="container max-w-4xl mx-auto">
          <Card className="p-8 border-border/40 bg-card/50 backdrop-blur">
            {/* Tabs */}
            <div className="flex items-center gap-6 mb-8 border-b border-border pb-2">
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "lyrics"
                    ? "text-primary border-b-2 border-primary -mb-[9px]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("lyrics")}
              >
                Lyrics to Song
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "description"
                    ? "text-primary border-b-2 border-primary -mb-[9px]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("description")}
              >
                Text to Song
              </button>
            </div>

            {/* Lyrics Tab */}
            {activeTab === "lyrics" && (
              <div className="space-y-6">
                {/* Settings */}
                <div>
                  <Label className="text-base font-semibold mb-4 block">Settings</Label>
                  <MusicSettings
                    value={musicSettings}
                    onChange={setMusicSettings}
                    customMode={customMode}
                    onCustomModeChange={setCustomMode}
                  />
                </div>

                {/* Title - Only show for Lyrics mode */}
                {activeTab === "lyrics" && (
                <div>
                  <Label htmlFor="title" className="text-base font-semibold mb-2 block">
                    Title (Optional)
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your title"
                    maxLength={80}
                    className="bg-background/50"
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {title.length} / 80
                  </div>
                </div>
                )}

                {/* Lyrics */}
                <div>
                  <Label htmlFor="lyrics" className="text-base font-semibold mb-2 block">
                    Lyrics
                  </Label>
                  <Textarea
                    id="lyrics"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter lyrics of your music or try to get inspired"
                    className="min-h-[300px] bg-background/50 resize-none"
                    maxLength={3000}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {prompt.length} / 3000
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateLyrics}
                      disabled={isGeneratingLyrics || generateLyricsMutation.isPending}
                    >
                      {isGeneratingLyrics || generateLyricsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Write Lyrics For Me
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Voice</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={gender === "m" ? "default" : "outline"}
                      onClick={() => setGender("m")}
                      className="w-full"
                    >
                      Male
                    </Button>
                    <Button
                      variant={gender === "f" ? "default" : "outline"}
                      onClick={() => setGender("f")}
                      className="w-full"
                    >
                      Female
                    </Button>
                    <Button
                      variant={gender === "random" ? "default" : "outline"}
                      onClick={() => setGender("random")}
                      className="w-full"
                    >
                      Random
                    </Button>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Music className="mr-2 h-5 w-5" />
                      Generate
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-pink-500">
                  Lyrics, titles, and styles must not contain names of famous people or sensitive words.
                </p>
              </div>
            )}

            {/* Text to Song Tab */}
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="desc-title" className="text-base font-semibold mb-2 block">
                    Title (Optional)
                  </Label>
                  <Input
                    id="desc-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your title"
                    maxLength={80}
                    className="bg-background/50"
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {title.length} / 80
                  </div>
                </div>

                {/* Song Description */}
                <div>
                  <Label htmlFor="description" className="text-base font-semibold mb-2 block">
                    Song Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the song you want to create (e.g., 'A happy upbeat pop song about summer')"
                    className="min-h-[200px] bg-background/50 resize-none"
                    maxLength={200}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-right">
                    {description.length} / 200
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Voice</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={gender === "m" ? "default" : "outline"}
                      onClick={() => setGender("m")}
                      className="w-full"
                    >
                      Male
                    </Button>
                    <Button
                      variant={gender === "f" ? "default" : "outline"}
                      onClick={() => setGender("f")}
                      className="w-full"
                    >
                      Female
                    </Button>
                    <Button
                      variant={gender === "random" ? "default" : "outline"}
                      onClick={() => setGender("random")}
                      className="w-full"
                    >
                      Random
                    </Button>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Music className="mr-2 h-5 w-5" />
                      Generate
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-pink-500">
                  Lyrics, titles, and styles must not contain names of famous people or sensitive words.
                </p>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

