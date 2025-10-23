import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { nanoid } from "nanoid";
import { storagePut } from "./storage.js";

const execAsync = promisify(exec);

export async function downloadYouTubeAudio(youtubeUrl: string): Promise<{ url: string; title: string }> {
  const tempId = nanoid();
  const tempFile = `/tmp/youtube-${tempId}.mp3`;
  
  // First, try to get the video title
  let videoTitle = "Unknown Title";
  try {
    const { stdout } = await execAsync(`yt-dlp --print "%(title)s" "${youtubeUrl}"`, { timeout: 10000 });
    videoTitle = stdout.trim();
    console.log(`[YouTube] Video title: ${videoTitle}`);
  } catch (error) {
    console.warn(`[YouTube] Failed to get video title:`, error instanceof Error ? error.message : String(error));
  }
  
  // Try multiple strategies
  const strategies = [
    // Strategy 1: Use android client
    `yt-dlp --extractor-args "youtube:player_client=android" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
    // Strategy 2: Use ios client
    `yt-dlp --extractor-args "youtube:player_client=ios" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
    // Strategy 3: Use web client with different user agent
    `yt-dlp --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
    // Strategy 4: Basic download
    `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`,
  ];
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`[YouTube] Trying strategy ${i + 1}/${strategies.length}`);
      await execAsync(strategies[i], { timeout: 120000 }); // 2 minute timeout per strategy
      
      // Check if file exists
      const fs = await import("fs/promises");
      await fs.access(tempFile);
      console.log(`[YouTube] Strategy ${i + 1} succeeded`);
      break; // Success!
    } catch (error) {
      console.log(`[YouTube] Strategy ${i + 1} failed:`, error instanceof Error ? error.message : String(error));
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next strategy
    }
  }
  
  try {
    // Check if download succeeded
    const fs = await import("fs/promises");
    await fs.access(tempFile);
  } catch {
    throw new Error(`Failed to download YouTube audio after trying all strategies: ${lastError?.message || "Unknown error"}`);
  }
  
  try {
    
    // Read the file
    const fs = await import("fs/promises");
    const audioBuffer = await fs.readFile(tempFile);
    
    // Upload to S3
    const s3Key = `voice-covers/input-${tempId}.mp3`;
    const result = await storagePut(s3Key, audioBuffer, "audio/mpeg");
    
    // Clean up temp file
    await unlink(tempFile);
    
    return { url: result.url, title: videoTitle };
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempFile);
    } catch {}
    
    throw new Error(`Failed to upload YouTube audio to S3: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function isYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url);
}

