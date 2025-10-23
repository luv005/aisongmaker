import Replicate from "replicate";
import { getDb } from "./db.js";
import { voiceModels } from "../drizzle/schema.js";
import { eq, like, desc } from "drizzle-orm";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface VoiceModel {
  id: string;
  name: string;
  category: string;
  avatar: string;
  uses: number;
  likes: number;
  demoAudioUrl?: string | null;
}

export interface RVCConversionParams {
  songInput: string; // URL to audio file
  rvcModel: string; // Voice model name
  pitchChange?: "no-change" | "male-to-female" | "female-to-male";
  indexRate?: number; // 0-1, control accent
  filterRadius?: number; // 0-7
  rmsMixRate?: number; // 0-1
  protect?: number; // 0-0.5
  outputFormat?: "mp3" | "wav";
}

export interface RVCConversionResult {
  audioUrl: string;
  status: "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Convert a song to use a different voice using RVC
 */
export async function convertVoice(
  params: RVCConversionParams
): Promise<RVCConversionResult> {
  try {
    console.log("[RVC] Starting Replicate API call with params:", {
      rvcModel: params.rvcModel,
      songInput: params.songInput,
      pitchChange: params.pitchChange,
    });
    
    const rawOutput = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550" as any,
      {
        input: {
          song_input: params.songInput,
          rvc_model: params.rvcModel,
          pitch_change: params.pitchChange || "no-change",
          index_rate: params.indexRate ?? 0.5,
          filter_radius: params.filterRadius ?? 3,
          rms_mix_rate: params.rmsMixRate ?? 0.25,
          protect: params.protect ?? 0.33,
          output_format: params.outputFormat || "mp3",
        },
      }
    );
    
    console.log("[RVC] Raw output from Replicate:", rawOutput);
    console.log("[RVC] Raw output type:", typeof rawOutput);
    console.log("[RVC] Raw output constructor:", rawOutput?.constructor?.name);
    
    const output = rawOutput as unknown as string;

    console.log("[RVC] Replicate output type:", typeof output);
    console.log("[RVC] Replicate output:", JSON.stringify(output));
    
    // Handle both string and FileOutput responses
    let audioUrl: string = "";
    
    if (typeof output === 'string') {
      audioUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      // Handle array response
      const first = output[0];
      if (typeof first === 'string') {
        audioUrl = first;
      } else if (first && typeof first === 'object' && 'url' in first && typeof first.url === 'string') {
        audioUrl = first.url;
      }
    } else if (output && typeof output === 'object') {
      // Handle object response
      const obj = output as any;
      if ('url' in obj && typeof obj.url === 'string') {
        audioUrl = obj.url;
      } else if (typeof obj.toString === 'function' && obj.toString() !== '[object Object]') {
        // Try toString() for URL-like objects
        audioUrl = obj.toString();
      }
    }
    
    console.log("[RVC] Extracted audio URL:", audioUrl);
    
    if (!audioUrl || audioUrl === "" || audioUrl.startsWith('[Function')) {
      console.error("[RVC] Failed to extract valid audio URL from output:", output);
      throw new Error("Failed to extract audio URL from Replicate response");
    }
    
    return {
      audioUrl,
      status: "completed",
    };
  } catch (error) {
    console.error("RVC conversion error:", error);
    return {
      audioUrl: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Pre-defined voice models available in the app
 * Real famous artists and characters for AI music covers
 */
export const VOICE_MODELS: VoiceModel[] = [
  // Popular Female Artists
  {
    id: "taylor-swift",
    name: "Taylor Swift",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=taylor&backgroundColor=ffc9c9",
    uses: 52300,
    likes: 1124,
  },
  {
    id: "ariana-grande",
    name: "Ariana Grande",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ariana&backgroundColor=f4c2c2",
    uses: 48100,
    likes: 987,
  },
  {
    id: "billie-eilish",
    name: "Billie Eilish",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=billie&backgroundColor=b8e0d2",
    uses: 45200,
    likes: 892,
  },
  {
    id: "lady-gaga",
    name: "Lady Gaga",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gaga&backgroundColor=ffd5dc",
    uses: 41300,
    likes: 834,
  },
  {
    id: "adele",
    name: "Adele",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=adele&backgroundColor=eac4d5",
    uses: 38900,
    likes: 756,
  },
  
  // Popular Male Artists
  {
    id: "the-weeknd",
    name: "The Weeknd",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=weeknd&backgroundColor=b6e3f4",
    uses: 39100,
    likes: 812,
  },
  {
    id: "michael-jackson",
    name: "Michael Jackson",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mj&backgroundColor=ffdfbf",
    uses: 36700,
    likes: 723,
  },
  {
    id: "ed-sheeran",
    name: "Ed Sheeran",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ed&backgroundColor=ffd4a3",
    uses: 32400,
    likes: 621,
  },
  {
    id: "bruno-mars",
    name: "Bruno Mars",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bruno&backgroundColor=c0aede",
    uses: 28900,
    likes: 543,
  },
  {
    id: "justin-bieber",
    name: "Justin Bieber",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=justin&backgroundColor=d1d4f9",
    uses: 27500,
    likes: 512,
  },
  
  // Rappers
  {
    id: "drake",
    name: "Drake",
    category: "Rapper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=drake&backgroundColor=ffd5dc",
    uses: 35200,
    likes: 689,
  },
  {
    id: "eminem",
    name: "Eminem",
    category: "Rapper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eminem&backgroundColor=e0e0e0",
    uses: 31800,
    likes: 634,
  },
  {
    id: "kanye-west",
    name: "Kanye West",
    category: "Rapper",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kanye&backgroundColor=c7ceea",
    uses: 28100,
    likes: 567,
  },
  
  // K-Pop
  {
    id: "jungkook",
    name: "Jungkook (BTS)",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jungkook&backgroundColor=f4e4ba",
    uses: 42700,
    likes: 891,
  },
  {
    id: "lisa",
    name: "Lisa (BLACKPINK)",
    category: "Music",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisa&backgroundColor=ffd3e1",
    uses: 38400,
    likes: 767,
  },
  
  // Anime Characters
  {
    id: "hatsune-miku",
    name: "Hatsune Miku",
    category: "Anime",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=miku&backgroundColor=b8e0d2",
    uses: 29200,
    likes: 626,
  },
  {
    id: "gojo",
    name: "Satoru Gojo",
    category: "Anime",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gojo&backgroundColor=d4f1f4",
    uses: 22600,
    likes: 455,
  },
  
  // Cartoon Characters
  {
    id: "spongebob",
    name: "SpongeBob SquarePants",
    category: "Cartoon",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=spongebob&backgroundColor=fff3b0",
    uses: 31300,
    likes: 608,
  },
  {
    id: "peter-griffin",
    name: "Peter Griffin",
    category: "Cartoon",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=peter&backgroundColor=e8f4f8",
    uses: 25800,
    likes: 512,
  },
  
  // Other Popular
  {
    id: "minecraft-villager",
    name: "Minecraft Villager",
    category: "Game",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=villager&backgroundColor=a8dadc",
    uses: 62100,
    likes: 823,
  },
];

/**
 * Get voice models by category
 */
export async function getVoicesByCategory(category?: string): Promise<VoiceModel[]> {
  const db = await getDb();
  if (!db) return [];
  
  if (!category || category === "All") {
    const models = await db.select().from(voiceModels).orderBy(desc(voiceModels.uses));
    return models.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      avatar: m.avatarUrl || "",
      uses: m.uses || 0,
      likes: m.likes || 0,
      demoAudioUrl: m.demoAudioUrl,
    }));
  }
  const models = await db.select().from(voiceModels).where(eq(voiceModels.category, category)).orderBy(desc(voiceModels.uses));
  return models.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0,
    demoAudioUrl: m.demoAudioUrl,
  }));
}

/**
 * Get trending voices (top by uses)
 */
export async function getTrendingVoices(limit: number = 5): Promise<VoiceModel[]> {
  const db = await getDb();
  if (!db) return [];
  
  const models = await db.select().from(voiceModels).where(eq(voiceModels.isTrending, 1)).orderBy(desc(voiceModels.uses)).limit(limit);
  return models.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0,
    demoAudioUrl: m.demoAudioUrl,
  }));
}

/**
 * Search voices by name
 */
export async function searchVoices(query: string): Promise<VoiceModel[]> {
  const db = await getDb();
  if (!db) return [];
  
  const models = await db.select().from(voiceModels).where(like(voiceModels.name, `%${query}%`)).orderBy(desc(voiceModels.uses));
  return models.map(m => ({
    id: m.id,
    name: m.name,
    category: m.category,
    avatar: m.avatarUrl || "",
    uses: m.uses || 0,
    likes: m.likes || 0,
    demoAudioUrl: m.demoAudioUrl,
  }));
}

