import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Settings, Music, Mic, Guitar, Bot, Clapperboard, Gamepad2, GraduationCap, Briefcase, Heart } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import MusicSettings, { MusicSettingsData } from "@/components/MusicSettings";

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

    const selectedSettings = [
      musicSettings.style,
      musicSettings.mood,
      musicSettings.scenario,
    ].filter(Boolean);

    if (activeTab === "description") {
      if (!description.trim()) {
        toast.error("Please enter a song description");
        return;
      }

      generateMutation.mutate({
        prompt: "",
        description: description.trim(),
        title: title || undefined,
        gender,
        instrumental: false,
      });
      return;
    }

    if (selectedSettings.length === 0 && !customMode) {
      toast.error("Please select at least one music setting");
      return;
    }

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
    document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative py-12 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background"></div>
        <div className="relative container max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">
            Create Songs with AI Song Maker
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            Turn your text into music and songs for free with our ai music generator
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white font-semibold shadow-lg transform hover:scale-105 transition-transform duration-300"
            onClick={scrollToGenerator}
          >
            Start Creating Music For Free
          </Button>
        </div>
      </section>

      {/* AI Song Generator Section */}
      <section id="generator" className="py-6 px-6">
        <div className="container max-w-3xl mx-auto">
          <Card className="p-6 border-border/40 bg-card/50 backdrop-blur-lg shadow-2xl">
            {/* Tabs */}
            <div className="flex items-center gap-6 mb-6 border-b border-border pb-2">
              <button
                className={`px-4 py-2 text-lg font-medium transition-colors ${
                  activeTab === "lyrics"
                    ? "text-primary border-b-2 border-primary -mb-[9px]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("lyrics")}
              >
                Lyrics to Song
              </button>
              <button
                className={`px-4 py-2 text-lg font-medium transition-colors ${
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

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-background">
        <div className="container max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Create Your Masterpiece in 3 Simple Steps</h2>
          <p className="text-lg text-muted-foreground mb-12">From a spark of an idea to a full song in minutes.</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-card/30 rounded-lg border border-border/20">
              <div className="flex items-center justify-center h-16 w-16 bg-gradient-to-br from-teal-500 to-green-500 rounded-full mx-auto mb-6">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">1. Describe Your Song</h3>
              <p className="text-muted-foreground">Start with lyrics or a simple text description of the song you envision. Choose the mood, style, and vocals.</p>
            </div>
            <div className="p-8 bg-card/30 rounded-lg border border-border/20">
              <div className="flex items-center justify-center h-16 w-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mx-auto mb-6">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">2. Let AI Work Its Magic</h3>
              <p className="text-muted-foreground">Our advanced AI analyzes your input and composes a unique piece of music, complete with vocals and instruments.</p>
            </div>
            <div className="p-8 bg-card/30 rounded-lg border border-border/20">
              <div className="flex items-center justify-center h-16 w-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full mx-auto mb-6">
                <Guitar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">3. Download & Share</h3>
              <p className="text-muted-foreground">Listen to your creation, download the royalty-free track, and share it with the world. It’s all yours!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Features of the AI Music Generator</h2>
            <p className="text-lg text-muted-foreground">Our AI music generator provides a variety of features that simplify the music creation process, making it easy and efficient.</p>
          </div>

          {/* Text to Song Feature */}
          <div className="mb-32">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
              <div>
                <img src="/images/ai-music-features.png" alt="Text to Song Interface" className="rounded-lg shadow-2xl border border-border/20" />
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">Text to Song</h3>
                <p className="text-muted-foreground mb-8">
                  Bring your ideas to life with our simple mode. Just describe what you want - the mood, style, instruments, or any musical elements - and our AI will craft a complete song that aligns with your vision. Ideal for those seeking quick results without delving into technical details.
                </p>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <Card className="p-6 bg-card/30 border-border/20">
                    <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-2">Simple Description</h4>
                    <p className="text-sm text-muted-foreground">Simply describe your song idea in everyday language - no musical background required. Our AI captures and translates your vision flawlessly.</p>
                  </Card>
                  <Card className="p-6 bg-card/30 border-border/20">
                    <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-2">Voice Control</h4>
                    <p className="text-sm text-muted-foreground">Select from male, female, or random vocals, or create instrumental tracks - offering complete flexibility for your musical goals.</p>
                  </Card>
                </div>
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" onClick={scrollToGenerator}>
                  Try Text to Song Now
                </Button>
              </div>
            </div>
          </div>

          {/* Lyrics to Song Feature */}
          <div className="mb-32">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
              <div className="order-2 md:order-1">
                <h3 className="text-3xl font-bold mb-4">Lyrics to Song</h3>
                <p className="text-muted-foreground mb-8">
                  Convert your lyrics into a complete song with our advanced mode. Input your lyrics, choose the musical style, and let our AI create the perfect accompaniment that brings your words to life with harmonious melodies.
                </p>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <Card className="p-6 bg-card/30 border-border/20">
                    <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-2">Style Customization</h4>
                    <p className="text-sm text-muted-foreground">Adjust your song with precise style preferences, genre specifications, and musical elements for a personalized outcome.</p>
                  </Card>
                  <Card className="p-6 bg-card/30 border-border/20">
                    <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4">
                      <Music className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-2">Smart Lyrics Processing</h4>
                    <p className="text-sm text-muted-foreground">Our AI evaluates the emotion and rhythm of your lyrics to compose perfectly matched music, alongside options for spontaneous random lyrics inspiration.</p>
                  </Card>
                </div>
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" onClick={scrollToGenerator}>
                  Create with Lyrics Now
                </Button>
              </div>
              <div className="order-1 md:order-2">
                <img src="/images/ai-music-features.png" alt="Lyrics to Song Interface" className="rounded-lg shadow-2xl border border-border/20" />
              </div>
            </div>
          </div>

          {/* AI Song Cover Generator Feature */}
          <div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="aspect-video bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg shadow-2xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/images/music-waves.svg')] opacity-20"></div>
                  <div className="relative z-10 text-center p-8">
                    <Guitar className="h-24 w-24 text-white mx-auto mb-4" />
                    <h4 className="text-2xl font-bold text-white">AI Voice Covers</h4>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">AI Song Cover Generator</h3>
                <p className="text-muted-foreground mb-8">
                  Reimagine existing songs as unique covers with our AI technology. Upload your favorite track and let our AI generate a fresh interpretation while keeping the original melody and structure intact, with options to tweak the style and vocals.
                </p>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <Card className="p-6 bg-card/30 border-border/20">
                    <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-2">Voice Cloning</h4>
                    <p className="text-sm text-muted-foreground">Upload your audio files to clone any voice. Our AI captures vocal characteristics and perfectly recreates them for your cover songs.</p>
                  </Card>
                  <Card className="p-6 bg-card/30 border-border/20">
                    <div className="flex items-center justify-center h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold mb-2">Advanced Voice Control</h4>
                    <p className="text-sm text-muted-foreground">Refine the cloned voice with detailed controls for pitch, tone, and expression to shape the ideal vocal performance for your cover.</p>
                  </Card>
                </div>
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* AI Voice Cover Section */}
      <section className="py-20 px-6">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Transform Any Song with AI Voice Covers</h2>
            <p className="text-lg text-muted-foreground">Choose from thousands of AI voice models to create unique covers of your favorite songs</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="p-6 bg-card/30 border-border/20 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="aspect-square bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                <Mic className="h-12 w-12 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Celebrity Voices</h3>
              <p className="text-sm text-muted-foreground mb-2">Famous singers & artists</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>1000+ voices</span>
              </div>
            </Card>
            <Card className="p-6 bg-card/30 border-border/20 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="aspect-square bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg mb-4 flex items-center justify-center">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Anime Characters</h3>
              <p className="text-sm text-muted-foreground mb-2">Popular anime voices</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>500+ voices</span>
              </div>
            </Card>
            <Card className="p-6 bg-card/30 border-border/20 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="aspect-square bg-gradient-to-br from-green-500 to-teal-500 rounded-lg mb-4 flex items-center justify-center">
                <Gamepad2 className="h-12 w-12 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Game Characters</h3>
              <p className="text-sm text-muted-foreground mb-2">Iconic gaming voices</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>300+ voices</span>
              </div>
            </Card>
            <Card className="p-6 bg-card/30 border-border/20 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="aspect-square bg-gradient-to-br from-yellow-500 to-red-500 rounded-lg mb-4 flex items-center justify-center">
                <Clapperboard className="h-12 w-12 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Cartoon Voices</h3>
              <p className="text-sm text-muted-foreground mb-2">Classic cartoon characters</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>200+ voices</span>
              </div>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Button size="lg" className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600">
              Explore All Voice Models
            </Button>
          </div>
        </div>
      </section>
      {/* Use Cases Section */}
      <section className="py-20 px-6 bg-background">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Who Can Benefit from AI Song Maker?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 text-center">
            <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Clapperboard className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Content Creators</h3>
            </div>
            <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Game Developers</h3>
            </div>
            <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Marketers</h3>
            </div>
            <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Students & Educators</h3>
            </div>
            <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Guitar className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Musicians</h3>
            </div>
            <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Heart className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Hobbyists</h3>
            </div>
             <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">AI Enthusiasts</h3>
            </div>
             <div className="p-6 bg-card/30 rounded-lg border border-border/20">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Anyone!</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Community Creations Section (Placeholder) */}
      <section className="py-20 px-6">
        <div className="container max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">Hear What Our Community Is Creating</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Placeholder Song Cards */}
            <Card className="p-4"><div className="aspect-video bg-muted rounded-lg mb-4"></div><h3 className="font-semibold">Summer Vibes</h3><p className="text-sm text-muted-foreground">Pop, Upbeat</p></Card>
            <Card className="p-4"><div className="aspect-video bg-muted rounded-lg mb-4"></div><h3 className="font-semibold">Midnight Drive</h3><p className="text-sm text-muted-foreground">Electronic, Chill</p></Card>
            <Card className="p-4"><div className="aspect-video bg-muted rounded-lg mb-4"></div><h3 className="font-semibold">City Lights</h3><p className="text-sm text-muted-foreground">Hip-Hop, Lo-fi</p></Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-background">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="p-4 bg-card/30 rounded-lg border border-border/20 cursor-pointer">
              <summary className="font-semibold text-lg">Is the music really royalty-free?</summary>
              <p className="mt-2 text-muted-foreground">Yes! All music you generate is 100% royalty-free. You can use it in your videos, podcasts, games, and any other commercial or non-commercial projects without any additional fees or licenses.</p>
            </details>
            <details className="p-4 bg-card/30 rounded-lg border border-border/20 cursor-pointer">
              <summary className="font-semibold text-lg">What kind of quality can I expect?</summary>
              <p className="mt-2 text-muted-foreground">We use state-of-the-art AI models to generate high-quality, professional-sounding music. You can download your tracks in standard audio formats, ready for any use.</p>
            </details>
            <details className="p-4 bg-card/30 rounded-lg border border-border/20 cursor-pointer">
              <summary className="font-semibold text-lg">How many songs can I create?</summary>
              <p className="mt-2 text-muted-foreground">Our free plan allows you to create a limited number of songs per day. For unlimited creations and more advanced features, you can upgrade to one of our premium plans.</p>
            </details>
             <details className="p-4 bg-card/30 rounded-lg border border-border/20 cursor-pointer">
              <summary className="font-semibold text-lg">Can I use my own lyrics?</summary>
              <p className="mt-2 text-muted-foreground">Absolutely! Our 'Lyrics to Song' feature is perfect for turning your poems, stories, or song lyrics into a complete musical piece. Just paste your text and let the AI do the rest.</p>
            </details>
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section className="py-20 px-6 bg-background">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Choose Your Creative Plan</h2>
            <p className="text-lg text-muted-foreground">Unlock unlimited music creation with our flexible pricing options</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-card/30 border-border/20 hover:border-primary/50 transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Basic</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold">$5.99</span>
                  <span className="text-muted-foreground">/week</span>
                </div>
                <span className="text-sm text-muted-foreground line-through">$7.99</span>
              </div>
              <Button className="w-full mb-6 bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600">
                Get Started
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>1000 credits (100 songs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Access to new model (V2.0)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Songs up to 8 mins, 5K lyrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>No daily limit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Unlimited downloads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Priority processing queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Standard sound</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-purple-500">Most Popular</Badge>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Standard</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold">$10.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <span className="text-sm text-muted-foreground line-through">$15.99</span>
              </div>
              <Button className="w-full mb-6 bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600">
                Get Started
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>5000 credits (500 songs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Access to new model (V2.0)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Songs up to 8 mins, 5K lyrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>No daily limit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Unlimited downloads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Priority processing queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Custom vibes & voices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Upload reference audio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Premium sound</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Export MIDI files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Vocal & instrumental isolator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Commercial use</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-card/30 border-border/20 hover:border-primary/50 transition-all">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold">$79.99</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <span className="text-sm text-muted-foreground line-through">$139.99</span>
              </div>
              <Button className="w-full mb-6 bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600">
                Get Started
              </Button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>24000 credits (2400 songs)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Access to new model (V2.0)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Songs up to 8 mins, 5K lyrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>No daily limit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Unlimited downloads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Priority processing queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Custom vibes & voices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Upload reference audio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Premium sound</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Export MIDI files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Vocal & instrumental isolator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>Commercial use</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/20">
        <div className="container max-w-6xl mx-auto text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AI Song Maker. All Rights Reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="/about" className="hover:text-primary">About</a>
            <a href="/privacy" className="hover:text-primary">Privacy Policy</a>
            <a href="/terms" className="hover:text-primary">Terms of Service</a>
            <a href="/contact" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

