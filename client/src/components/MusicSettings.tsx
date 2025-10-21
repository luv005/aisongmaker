import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, X } from "lucide-react";
import { useState, useEffect } from "react";

interface MusicSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (settings: MusicSettingsData) => void;
  initialSettings?: MusicSettingsData;
}

export interface MusicSettingsData {
  style: string;
  mood: string;
  scenario: string;
}

const STYLES = [
  "Pop", "Folk", "R&B", "Hip-hop", "Urban", "Rock", "Jazz",
  "Electronic", "Classical", "Disco", "Reggae", "Blues", "Country",
  "Experimental", "World", "Ethnic"
];

const MOODS = [
  "Relaxed", "Happy", "Energetic", "Romantic", "Sad", "Angry",
  "Inspired", "Warm", "Passionate", "Joyful", "Longing"
];

const SCENARIOS = [
  "Coffee shop", "Solitary walk", "Travel", "Sunset by the sea",
  "Quiet evening", "Late-night bar", "Urban romance", "City nightlife",
  "Rainy night", "Sunlit Shores"
];

export default function MusicSettings({ open, onOpenChange, onConfirm, initialSettings }: MusicSettingsProps) {
  const [style, setStyle] = useState(initialSettings?.style || "");
  const [mood, setMood] = useState(initialSettings?.mood || "");
  const [scenario, setScenario] = useState(initialSettings?.scenario || "");

  useEffect(() => {
    if (initialSettings) {
      setStyle(initialSettings.style || "");
      setMood(initialSettings.mood || "");
      setScenario(initialSettings.scenario || "");
    }
  }, [initialSettings]);

  const handleReset = () => {
    setStyle("");
    setMood("");
    setScenario("");
  };

  const handleConfirm = () => {
    onConfirm({ style, mood, scenario });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl">Settings</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Select the music features you are aiming for
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Style Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Style</h3>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <Button
                  key={s}
                  variant={style === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStyle(s)}
                  className={
                    style === s
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent"
                  }
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Mood Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Mood</h3>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Button
                  key={m}
                  variant={mood === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMood(m)}
                  className={
                    mood === m
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent"
                  }
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {/* Scenario Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Scenario</h3>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((sc) => (
                <Button
                  key={sc}
                  variant={scenario === sc ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScenario(sc)}
                  className={
                    scenario === sc
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-accent"
                  }
                >
                  {sc}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleConfirm}
            size="lg"
            className="px-8"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

