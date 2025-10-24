import Replicate from "replicate";
import crypto from "crypto";

interface ImageGenerationOptions {
  title: string;
  style?: string;
  seed?: string;
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generate song artwork using Replicate Flux Schnell model
 * Creates AI-generated images based on song title and style
 */
export async function generateSongArtwork(options: ImageGenerationOptions): Promise<string | undefined> {
  const { title, style = "" } = options;
  
  try {
    console.log(`[Image Generator] Generating artwork for: "${title}" with style: "${style}"`);
    
    // Construct a descriptive prompt for the image
    const prompt = constructImagePrompt(title, style);
    console.log(`[Image Generator] Using prompt: "${prompt}"`);
    
    // Generate image using Flux Schnell
    const output = await replicate.run(
      "black-forest-labs/flux-schnell" as any,
      {
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 90,
        },
      }
    ) as any;
    
    console.log("[Image Generator] Replicate output type:", typeof output);
    console.log("[Image Generator] Replicate raw output:", output);
    
    // Handle the output - Replicate returns FileOutput objects
    let imageUrl: string | undefined;
    
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      
      // FileOutput has a toString() method that returns the URL
      if (firstOutput && typeof firstOutput.toString === 'function') {
        const urlString = firstOutput.toString();
        if (urlString && urlString.startsWith('http')) {
          imageUrl = urlString;
        }
      }
      // Check if it's a FileOutput object with url() function
      else if (firstOutput && typeof firstOutput === 'object' && 'url' in firstOutput && typeof firstOutput.url === 'function') {
        imageUrl = firstOutput.url();
      }
      // Check if url is a string property
      else if (firstOutput && typeof firstOutput === 'object' && 'url' in firstOutput && typeof firstOutput.url === 'string') {
        imageUrl = firstOutput.url;
      } 
      // Check if it's already a string URL
      else if (typeof firstOutput === 'string') {
        imageUrl = firstOutput;
      }
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (output && typeof output === 'object') {
      // Try toString first
      if (typeof output.toString === 'function') {
        const urlString = output.toString();
        if (urlString && urlString.startsWith('http')) {
          imageUrl = urlString;
        }
      }
      // Try url property
      if (!imageUrl && 'url' in output) {
        if (typeof output.url === 'function') {
          imageUrl = output.url();
        } else if (typeof output.url === 'string') {
          imageUrl = output.url;
        }
      }
    }
    
    console.log("[Image Generator] Extracted URL:", imageUrl);
    
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      console.error("[Image Generator] Failed to extract valid image URL from output:", output);
      return undefined;
    }
    
    console.log(`[Image Generator] Successfully generated artwork: ${imageUrl}`);
    return imageUrl;
    
  } catch (error) {
    console.error("[Image Generator] Error generating artwork:", error);
    // Return undefined so the system can fall back to gradient or no image
    return undefined;
  }
}

/**
 * Construct a descriptive prompt for image generation based on song title and style
 */
function constructImagePrompt(title: string, style: string): string {
  // Base prompt for album cover style
  const basePrompt = "album cover art, professional music artwork, high quality, artistic";
  
  // Clean and format the title
  const cleanTitle = title.trim();
  
  // Parse style to extract relevant keywords
  const styleKeywords = style
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Build the prompt with title and style context
  let prompt = `${basePrompt}, inspired by "${cleanTitle}"`;
  
  // Add style-specific visual elements
  if (styleKeywords.length > 0) {
    const visualStyles = styleKeywords
      .map(keyword => getVisualStyleForMusicGenre(keyword))
      .filter(Boolean)
      .join(', ');
    
    if (visualStyles) {
      prompt += `, ${visualStyles}`;
    }
  }
  
  // Add general aesthetic guidelines
  prompt += ", vibrant colors, modern design, eye-catching, professional photography";
  
  return prompt;
}

/**
 * Map music genres/styles to visual aesthetics for better image generation
 */
function getVisualStyleForMusicGenre(genre: string): string {
  const genreMap: Record<string, string> = {
    // Genres
    'pop': 'colorful, bright, energetic, contemporary',
    'rock': 'bold, edgy, dramatic lighting, powerful',
    'jazz': 'sophisticated, moody, noir aesthetic, elegant',
    'classical': 'elegant, timeless, refined, orchestral',
    'electronic': 'futuristic, neon lights, digital art, cyberpunk',
    'hip hop': 'urban, street art, bold typography, modern',
    'rap': 'urban, street style, bold, contemporary',
    'country': 'rustic, warm tones, americana, natural',
    'blues': 'moody, vintage, soulful, atmospheric',
    'metal': 'dark, intense, dramatic, powerful',
    'folk': 'natural, organic, earthy tones, acoustic',
    'indie': 'artistic, alternative, creative, unique',
    'r&b': 'smooth, sophisticated, soulful, stylish',
    'soul': 'warm, emotional, vintage aesthetic, groovy',
    'funk': 'groovy, colorful, retro, vibrant',
    'disco': 'glittery, retro, colorful, dance floor',
    'reggae': 'tropical, warm colors, relaxed, island vibes',
    'punk': 'rebellious, raw, DIY aesthetic, bold',
    'edm': 'neon, energetic, festival vibes, electric',
    'house': 'club aesthetic, neon lights, energetic, modern',
    'techno': 'industrial, minimal, futuristic, dark',
    'ambient': 'atmospheric, dreamy, ethereal, peaceful',
    'trap': 'urban, modern, bold, street style',
    'dubstep': 'dark, bass-heavy aesthetic, futuristic, intense',
    
    // Moods
    'happy': 'bright, cheerful, uplifting, sunny',
    'sad': 'melancholic, blue tones, emotional, moody',
    'energetic': 'dynamic, vibrant, action-packed, lively',
    'calm': 'peaceful, serene, soft colors, tranquil',
    'romantic': 'dreamy, soft focus, warm lighting, intimate',
    'dark': 'noir, shadows, mysterious, dramatic',
    'uplifting': 'bright, inspiring, hopeful, radiant',
    'melancholic': 'moody, atmospheric, emotional, somber',
    'aggressive': 'intense, powerful, bold, dramatic',
    'chill': 'relaxed, cool tones, laid-back, smooth',
    'dramatic': 'theatrical, intense lighting, powerful, epic',
    'mysterious': 'enigmatic, shadows, intriguing, dark',
    'nostalgic': 'vintage, retro, warm tones, memories',
    'dreamy': 'ethereal, soft focus, surreal, floating',
    
    // Scenarios
    'party': 'festive, colorful, energetic, celebration',
    'workout': 'dynamic, powerful, motivating, intense',
    'study': 'focused, calm, minimal, peaceful',
    'sleep': 'peaceful, dark blue, dreamy, tranquil',
    'driving': 'road trip, freedom, open road, adventure',
    'beach': 'tropical, sunny, ocean vibes, relaxed',
    'night': 'nocturnal, city lights, mysterious, atmospheric',
    'morning': 'sunrise, fresh, bright, new beginnings',
    'rain': 'moody, atmospheric, water droplets, cozy',
    'sunset': 'golden hour, warm colors, beautiful, peaceful',
  };
  
  // Try exact match first
  if (genreMap[genre]) {
    return genreMap[genre];
  }
  
  // Try partial matches
  for (const [key, value] of Object.entries(genreMap)) {
    if (genre.includes(key) || key.includes(genre)) {
      return value;
    }
  }
  
  return '';
}

