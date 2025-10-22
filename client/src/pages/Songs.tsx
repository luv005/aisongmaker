import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Play, Pause, Download, Share2, MoreVertical, Music, Mic2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type TabType = "ai-music" | "ai-cover";

export default function Songs() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("ai-music");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handlePlayPause = (audioUrl: string, trackId: string) => {
    if (playingTrackId === trackId) {
      // Pause current track
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      // Play new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(trackId);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Completed</span>;
      case "processing":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">Processing</span>;
      case "pending":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Pending</span>;
      case "failed":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">{status}</span>;
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

    if (musicTracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Music className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No AI Music Yet</h3>
          <p className="text-muted-foreground mb-6">
            Start creating your first AI-generated music track
          </p>
          <Button onClick={() => setLocation("/")}>
            Create Music
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {musicTracks.map((track) => (
          <Card key={track.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                  <Music className="h-8 w-8 text-primary" />
                </div>
                {track.status === "completed" && track.audioUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => handlePlayPause(track.audioUrl!, track.id)}
                  >
                    {playingTrackId === track.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1 truncate">{track.title}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {track.prompt || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  {getStatusBadge(track.status)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(track.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {track.status === "completed" && track.audioUrl && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(track.audioUrl, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
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

    if (coverTracks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mic2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No AI Covers Yet</h3>
          <p className="text-muted-foreground mb-6">
            Start creating your first AI voice cover
          </p>
          <Button onClick={() => setLocation("/ai-cover")}>
            Create AI Cover
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coverTracks.map((cover) => (
          <Card key={cover.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-lg flex items-center justify-center">
                  <Mic2 className="h-8 w-8 text-purple-500" />
                </div>
                {cover.status === "completed" && cover.convertedAudioUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => handlePlayPause(cover.convertedAudioUrl!, cover.id)}
                  >
                    {playingTrackId === cover.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1 truncate">{cover.voiceModelName}</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Pitch: {cover.pitchChange || "no-change"}
                </p>
                <div className="flex items-center justify-between">
                  {getStatusBadge(cover.status)}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(cover.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {cover.status === "completed" && cover.convertedAudioUrl && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(cover.convertedAudioUrl, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Library</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/")}
            >
              <Music className="h-4 w-4 mr-2" />
              Create Music
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/ai-cover")}
            >
              <Mic2 className="h-4 w-4 mr-2" />
              Create Cover
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "ai-music"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("ai-music")}
          >
            <Music className="h-4 w-4 inline-block mr-2" />
            AI Music
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "ai-cover"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("ai-cover")}
          >
            <Mic2 className="h-4 w-4 inline-block mr-2" />
            AI Cover
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-xl font-semibold mb-2">Sign in to view your library</h3>
            <p className="text-muted-foreground mb-6">
              Create an account to save and manage your AI-generated content
            </p>
            <Button onClick={() => window.location.href = "/api/auth/login"}>
              Sign In
            </Button>
          </div>
        ) : (
          <>
            {activeTab === "ai-music" && renderMusicTracks()}
            {activeTab === "ai-cover" && renderCoverTracks()}
          </>
        )}
      </div>
    </div>
  );
}

