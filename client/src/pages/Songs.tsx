import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Play, Pause, Download, Share2, MoreVertical, Music, Mic2, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

type TabType = "ai-music" | "ai-cover";

export default function Songs() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("ai-music");
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();

  // Query AI Music tracks
  const { data: musicTracks = [], isLoading: musicLoading } = trpc.music.getHistory.useQuery(
    undefined,
    {
      enabled: isAuthenticated && activeTab === "ai-music",
      refetchInterval: (query) => {
        const tracks = query.state.data;
        if (!Array.isArray(tracks)) return false;
        return tracks.some(
          (track) => track.status === "pending" || track.status === "processing"
        )
          ? 5000
          : false;
      },
      refetchOnWindowFocus: false,
    }
  );

  // Query AI Cover tracks
  const { data: coverTracks = [], isLoading: coversLoading } = trpc.voiceCover.getUserCovers.useQuery(
    undefined,
    {
      enabled: isAuthenticated && activeTab === "ai-cover",
      refetchInterval: (query) => {
        const covers = query.state.data;
        if (!Array.isArray(covers)) return false;
        return covers.some(
          (cover) => cover.status === "pending" || cover.status === "processing"
        )
          ? 5000
          : false;
      },
      refetchOnWindowFocus: false,
    }
  );

  const handlePlayMusic = (track: any) => {
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

  const handlePlayCover = (cover: any) => {
    if (currentTrack?.id === cover.id && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: cover.id,
        title: cover.songTitle || cover.voiceModelName,
        artist: cover.voiceModelName,
        audioUrl: cover.convertedAudioUrl,
      });
    }
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
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Copied successfully!");
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Failed to copy link");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30">Completed</span>;
      case "processing":
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30 animate-pulse">Processing</span>;
      case "pending":
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/30">Pending</span>;
      case "failed":
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border border-red-500/30">Failed</span>;
      default:
        return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">{status}</span>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderMusicTracks = () => {
    if (musicLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="glass rounded-3xl p-12 max-w-md">
            <Sparkles className="h-16 w-16 text-primary mb-4 mx-auto float" />
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Sign in to view your library
            </h3>
            <p className="text-muted-foreground mb-6">
              Create an account to save and manage your AI-generated music
            </p>
            <Button className="gradient-accent glow-hover rounded-full px-8">
              Sign In
            </Button>
          </div>
        </div>
      );
    }

    if (musicTracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="glass rounded-3xl p-12 max-w-md">
            <Music className="h-16 w-16 text-primary mb-4 mx-auto float" />
            <h3 className="text-2xl font-bold mb-3">No AI Music Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start creating your first AI-generated song
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="gradient-accent glow-hover rounded-full px-8"
            >
              <Music className="h-4 w-4 mr-2" />
              Create Music
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {musicTracks.map((track, index) => (
          <Card 
            key={track.id} 
            className="glass glow-hover p-6 rounded-2xl border-0 transition-all duration-300 hover:scale-105"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 gradient-card rounded-2xl flex items-center justify-center overflow-hidden">
                  {track.imageUrl ? (
                    <img src={track.imageUrl} alt={track.title || "Track"} className="w-full h-full object-cover" />
                  ) : (
                    <Music className="h-10 w-10 text-primary" />
                  )}
                </div>
                {track.status === "completed" && track.audioUrl && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full p-0 gradient-accent glow shadow-lg"
                    onClick={() => handlePlayMusic(track)}
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base mb-1 truncate">{track.title || "Untitled"}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {track.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  {getStatusBadge(track.status)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(track.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {track.status === "completed" && track.audioUrl && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 rounded-full hover:bg-primary/20"
                      onClick={() => handleDownload(track.audioUrl!, `${track.title || 'Untitled'}.mp3`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-9 w-9 p-0 rounded-full hover:bg-primary/20"
                      onClick={() => handleShare(track.id, track.title || 'Untitled')}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-primary/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderCoverTracks = () => {
    if (coversLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="glass rounded-3xl p-12 max-w-md">
            <Sparkles className="h-16 w-16 text-primary mb-4 mx-auto float" />
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Sign in to view your library
            </h3>
            <p className="text-muted-foreground mb-6">
              Create an account to save and manage your AI voice covers
            </p>
            <Button className="gradient-accent glow-hover rounded-full px-8">
              Sign In
            </Button>
          </div>
        </div>
      );
    }

    if (coverTracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="glass rounded-3xl p-12 max-w-md">
            <Mic2 className="h-16 w-16 text-primary mb-4 mx-auto float" />
            <h3 className="text-2xl font-bold mb-3">No AI Covers Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start creating your first AI voice cover
            </p>
            <Button 
              onClick={() => setLocation("/ai-cover")}
              className="gradient-accent glow-hover rounded-full px-8"
            >
              <Mic2 className="h-4 w-4 mr-2" />
              Create AI Cover
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coverTracks.map((cover, index) => (
          <Card 
            key={cover.id} 
            className="glass glow-hover p-6 rounded-2xl border-0 transition-all duration-300 hover:scale-105"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 gradient-card rounded-2xl flex items-center justify-center">
                  <Mic2 className="h-10 w-10 text-primary" />
                </div>
                {cover.status === "completed" && cover.convertedAudioUrl && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full p-0 gradient-accent glow shadow-lg"
                    onClick={() => handlePlayCover(cover)}
                  >
                    {currentTrack?.id === cover.id && isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base mb-1 truncate">
                  {cover.songTitle || cover.voiceModelName}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {cover.songTitle ? cover.voiceModelName : `Pitch: ${cover.pitchChange || "no-change"}`}
                </p>
                <div className="flex items-center justify-between">
                  {getStatusBadge(cover.status)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(cover.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {cover.status === "completed" && cover.convertedAudioUrl && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 rounded-full hover:bg-primary/20"
                      onClick={() => handleDownload(cover.convertedAudioUrl!, `${cover.songTitle || cover.voiceModelName} (${cover.voiceModelName}).mp3`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-9 w-9 p-0 rounded-full hover:bg-primary/20"
                      onClick={() => handleShare(cover.id, cover.songTitle || cover.voiceModelName || 'Untitled')}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-full hover:bg-primary/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen gradient-sunset">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 backdrop-blur-xl px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              My Library
            </h1>
            <p className="text-muted-foreground mt-1">Your creative masterpieces</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
              className="rounded-full border-primary/30 hover:border-primary hover:bg-primary/10"
            >
              <Music className="h-4 w-4 mr-2" />
              Create Music
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/ai-cover")}
              className="rounded-full border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Mic2 className="h-4 w-4 mr-2" />
              Create Cover
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 glass rounded-full p-1 w-fit">
          <button
            onClick={() => setActiveTab("ai-music")}
            className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
              activeTab === "ai-music"
                ? "gradient-accent text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Music className="h-4 w-4" />
            <span className="font-medium">AI Music</span>
          </button>
          <button
            onClick={() => setActiveTab("ai-cover")}
            className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
              activeTab === "ai-cover"
                ? "gradient-accent text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic2 className="h-4 w-4" />
            <span className="font-medium">AI Cover</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative flex-1 px-6 py-8 pb-24">
        {activeTab === "ai-music" ? renderMusicTracks() : renderCoverTracks()}
      </main>
    </div>
  );
}

