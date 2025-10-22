import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { nanoid } from "nanoid";
import { storagePut } from "./storage.js";

const execAsync = promisify(exec);

export async function downloadYouTubeAudio(youtubeUrl: string): Promise<string> {
  const tempId = nanoid();
  const tempFile = `/tmp/youtube-${tempId}.mp3`;
  
  try {
    // Use yt-dlp to download audio
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" "${youtubeUrl}"`;
    await execAsync(command, { timeout: 300000 }); // 5 minute timeout
    
    // Read the file
    const fs = await import("fs/promises");
    const audioBuffer = await fs.readFile(tempFile);
    
    // Upload to S3
    const s3Key = `voice-covers/input-${tempId}.mp3`;
    const result = await storagePut(s3Key, audioBuffer, "audio/mpeg");
    
    // Clean up temp file
    await unlink(tempFile);
    
    return result.url;
  } catch (error) {
    // Clean up temp file on error
    try {
      await unlink(tempFile);
    } catch {}
    
    throw new Error(`Failed to download YouTube audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function isYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url);
}

