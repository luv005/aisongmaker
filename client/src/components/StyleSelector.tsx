import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

interface StyleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStyle: (style: string) => void;
}

type Category = "genre" | "mood" | "voice" | "instrument" | "style";

const styleData = {
  genre: {
    title: "Genre",
    items: [
      "Pop", "Rap", "Hip Hop", "R&B", "Jazz", "Rock", "Folk", "Blues", "Country",
      "Electronic", "Dance", "House", "Techno", "Dubstep", "Reggae", "Latin",
      "Classical", "Opera", "Metal", "Punk", "Indie", "Alternative", "Soul", "Funk"
    ],
  },
  mood: {
    title: "Mood",
    items: [
      "Positive", "Sad", "Romantic", "Exciting", "Relaxing", "Thoughtful",
      "Powerful", "Anxious", "Melancholic", "Uplifting", "Energetic", "Calm",
      "Dark", "Bright", "Mysterious", "Playful", "Serious", "Dreamy"
    ],
    subcategories: {
      "Positive": ["Happy", "Joyful", "Cheerful", "Optimistic"],
      "Sad": ["Melancholic", "Sorrowful", "Heartbroken", "Nostalgic"],
      "Romantic": ["Passionate", "Tender", "Loving", "Intimate"],
    }
  },
  voice: {
    title: "Voice",
    items: [
      "Acapella", "Arabian Ornamental", "Dispassionate", "Emotional", "Ethereal",
      "Gregorian chant", "Hindustani", "Lounge Singer", "Melismatic", "Operatic",
      "Rap", "Shouting", "Spoken Word", "Whispering", "Yodeling"
    ],
  },
  instrument: {
    title: "Instrument",
    items: [
      "Guitar", "Bass", "Drums", "Piano", "Violin", "Cello", "Harp", "Banjo",
      "Mandolin", "Ukulele", "Saxophone", "Trumpet", "Flute", "Clarinet",
      "Synthesizer", "Accordion", "Harmonica", "Sitar", "Tabla", "Didgeridoo"
    ],
  },
  style: {
    title: "Style",
    items: [
      "Danceable", "Children", "Retro", "Traditional", "Party", "Soft", "Weird",
      "World", "Lofi", "Ambient", "Cinematic", "Epic", "Minimalist", "Acoustic",
      "Orchestral", "A Cappella", "Experimental", "Fusion", "Vintage", "Modern"
    ],
  },
};

export default function StyleSelector({ open, onOpenChange, onSelectStyle }: StyleSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const categories: { key: Category; label: string }[] = [
    { key: "genre", label: "Genre" },
    { key: "mood", label: "Mood" },
    { key: "voice", label: "Voice" },
    { key: "instrument", label: "Instrument" },
    { key: "style", label: "Style" },
  ];

  const handleSelectItem = (item: string) => {
    onSelectStyle(item);
    onOpenChange(false);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
  };

  const handleBack = () => {
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(null);
    }
  };

  const renderContent = () => {
    if (!selectedCategory) {
      // Show categories list
      return (
        <div className="grid grid-cols-2 gap-0">
          <div className="border-r border-border p-6">
            <h2 className="text-xl font-semibold text-muted-foreground mb-6">Categories</h2>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    selectedCategory === cat.key
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span className="font-medium">{cat.label}</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">
              Select a category
            </h2>
            <p className="text-muted-foreground">Choose a category from the left to see options</p>
          </div>
        </div>
      );
    }

    const categoryData = styleData[selectedCategory];
    const hasSubcategories = 'subcategories' in categoryData;
    const items = selectedSubcategory && hasSubcategories
      ? (categoryData.subcategories as any)?.[selectedSubcategory] || []
      : categoryData.items;

    return (
      <div className="grid grid-cols-2 gap-0">
        <div className="border-r border-border p-6">
          <button
            onClick={handleBack}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-muted-foreground mb-6">Categories</h2>
          <div className="space-y-2">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <span className="font-medium">{cat.label}</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6">
            {selectedSubcategory || categoryData.title}
          </h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {items.map((item: string) => (
              <button
                key={item}
                onClick={() => {
                  const hasSubcategories = 'subcategories' in categoryData;
                  if (hasSubcategories && (categoryData.subcategories as any)[item]) {
                    setSelectedSubcategory(item);
                  } else {
                    handleSelectItem(item);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <span>{item}</span>
                {'subcategories' in categoryData && (categoryData.subcategories as any)[item] && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-card border-primary">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

