import { getAudioDurationInSeconds } from "get-audio-duration";
import { createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

/**
 * Get audio duration from a URL by downloading it temporarily
 */
export async function getAudioDuration(audioUrl: string): Promise<number> {
  let tempFilePath: string | null = null;
  
  try {
    // Generate a temporary file path
    const tempFileName = `audio-${randomBytes(16).toString("hex")}.mp3`;
    tempFilePath = join(tmpdir(), tempFileName);
    
    // Download the audio file
    console.log(`[Audio Utils] Downloading audio from ${audioUrl}`);
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }
    
    // Save to temp file
    const fileStream = createWriteStream(tempFilePath);
    const buffer = await response.arrayBuffer();
    fileStream.write(Buffer.from(buffer));
    fileStream.end();
    
    // Wait for file to be written
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
    
    // Get duration
    console.log(`[Audio Utils] Getting duration from ${tempFilePath}`);
    const duration = await getAudioDurationInSeconds(tempFilePath);
    console.log(`[Audio Utils] Duration: ${duration} seconds`);
    
    return Math.round(duration);
  } catch (error) {
    console.error("[Audio Utils] Error getting audio duration:", error);
    return 0; // Return 0 if we can't get duration
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log(`[Audio Utils] Cleaned up temp file ${tempFilePath}`);
      } catch (err) {
        console.error(`[Audio Utils] Failed to clean up temp file:`, err);
      }
    }
  }
}

