import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Play, Heart, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const CATEGORIES = ["All", "Cartoon", "Rapper", "Celebrity", "Movie", "Game", "Anime"];

export default function AICover() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  // Note: Voice preview functionality removed as we don't have demo audio samples
  // Users can hear the voices after generating a cover

  const { data: trendingVoices } = trpc.voiceCover.getTrending.useQuery();
  const { data: allVoices } = trpc.voiceCover.getVoices.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
  });

  const filteredVoices = searchQuery
    ? allVoices?.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVoices;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create AI Cover with 4000+ AI Voice Models
          </h1>
        </div>
      </div>

      <div className="container py-8">
        {/* Trending Voices Section */}
        {trendingVoices && trendingVoices.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h2 className="text-xl font-semibold text-foreground">
                  Trending Voices
                </h2>
                <span className="text-sm text-muted-foreground">
                  - Weekly top voices
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {trendingVoices.map((voice) => (
                <Card
                  key={voice.id}
                  className="group cursor-pointer overflow-hidden border-border/40 bg-card/50 hover:bg-card hover:border-green-500/50 transition-all"
                  onClick={() => setLocation(`/ai-cover/${voice.id}`)}
                >
                  <div className="relative aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl">🎤</div>
                    </div>
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                      #{trendingVoices.indexOf(voice) + 1}
                    </div>
                    {/* Play button removed - no demo audio available */}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground mb-1 truncate">
                      {voice.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {voice.category}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{(voice.uses / 1000).toFixed(1)}K</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>{voice.likes}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Voices Section */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h2 className="text-xl font-semibold text-foreground">All Voices</h2>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/40"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "border-border/40"
                }
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Voice Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredVoices?.map((voice) => (
              <Card
                key={voice.id}
                className="group cursor-pointer overflow-hidden border-border/40 bg-card/50 hover:bg-card hover:border-green-500/50 transition-all"
                onClick={() => setLocation(`/ai-cover/${voice.id}`)}
              >
                <div className="relative aspect-square bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl">🎤</div>
                  </div>
                  {/* Hover overlay - no play button as demo audio not available */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all"></div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 truncate">
                    {voice.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {voice.category}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{(voice.uses / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{voice.likes}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredVoices && filteredVoices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No voices found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

