/**
 * MiniMax Music-1.5 API Integration
 * Official API for AI music generation with vocals and lyrics support
 * Pricing: $0.03 per song (up to 4 minutes)
 */

import { promises as fs } from "fs";
import path from "path";
import { ENV } from "./_core/env";
import { ensureGeneratedSubdir, getGeneratedPublicPath } from "./_core/paths.ts";
import { gunzipSync, inflateSync } from "node:zlib";

const MINIMAX_API_BASE = "https://api.minimax.io/v1/music_generation";
const MINIMAX_GROUP_ID = "1965003715358236847"; // Extracted from JWT token

export interface GenerateMusicParams {
  prompt: string; // The lyrics or description
  title?: string;
  style?: string;
  instrumental?: boolean;
}

export interface MusicGenerationResponse {
  success: boolean;
  taskId?: string;
  audioUrl?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

type AudioMetadata = {
  mimeType: string;
  extension: string;
};

type DecodedAudio = {
  buffer: Buffer;
  metadata: AudioMetadata;
};

const DEFAULT_AUDIO_METADATA: AudioMetadata = {
  mimeType: "audio/mpeg",
  extension: "mp3",
};

const HEX_REGEX = /^[0-9a-fA-F]+$/;

const AUDIO_METADATA_BY_SUBTYPE: Record<string, AudioMetadata> = {
  mpeg: { mimeType: "audio/mpeg", extension: "mp3" },
  mp3: { mimeType: "audio/mpeg", extension: "mp3" },
  wav: { mimeType: "audio/wav", extension: "wav" },
  wave: { mimeType: "audio/wav", extension: "wav" },
  ogg: { mimeType: "audio/ogg", extension: "ogg" },
  m4a: { mimeType: "audio/mp4", extension: "m4a" },
  mp4: { mimeType: "audio/mp4", extension: "m4a" },
};

function normalizeSubtype(subtype: string | undefined) {
  if (!subtype) return undefined;
  return subtype.replace(/^x-/, "").toLowerCase();
}

function resolveAudioMetadata(subtype: string | undefined): AudioMetadata {
  const normalized = normalizeSubtype(subtype);
  if (!normalized) {
    return { ...DEFAULT_AUDIO_METADATA };
  }
  if (AUDIO_METADATA_BY_SUBTYPE[normalized]) {
    return { ...AUDIO_METADATA_BY_SUBTYPE[normalized] };
  }
  return {
    mimeType: `audio/${normalized}`,
    extension: normalized.replace(/[^a-z0-9]/gi, "") || DEFAULT_AUDIO_METADATA.extension,
  };
}

function decodeAudioPayload(rawAudio: string): DecodedAudio {
  let metadata = { ...DEFAULT_AUDIO_METADATA };
  let payload = rawAudio.trim();

  const dataUrlMatch = payload.match(/^data:audio\/([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const [, subtypeRaw, base64Payload] = dataUrlMatch;
    metadata = resolveAudioMetadata(subtypeRaw);
    const buffer = Buffer.from(base64Payload, "base64");
    return {
      buffer: maybeDecompressAudio(buffer),
      metadata,
    };
  }

  if (HEX_REGEX.test(payload)) {
    const buffer = Buffer.from(payload, "hex");
    return {
      buffer: maybeDecompressAudio(buffer),
      metadata,
    };
  }

  try {
    const sanitized = payload.replace(/\s+/g, "");
    const buffer = Buffer.from(sanitized, "base64");
    return {
      buffer: maybeDecompressAudio(buffer),
      metadata,
    };
  } catch (error) {
    throw new Error("Unsupported audio encoding returned by MiniMax");
  }
}

function maybeDecompressAudio(buffer: Buffer): Buffer {
  if (!buffer || buffer.length < 2) {
    return buffer;
  }

  const byte1 = buffer[0];
  const byte2 = buffer[1];
  const isGzip = byte1 === 0x1f && byte2 === 0x8b;
  const isZlib =
    byte1 === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(byte2);

  try {
    if (isGzip) {
      return gunzipSync(buffer);
    }
    if (isZlib) {
      return inflateSync(buffer);
    }
  } catch (error) {
    console.warn("[MiniMax] Failed to decompress audio payload, using raw buffer:", error);
  }

  return buffer;
}

/**
 * Generate music using MiniMax Music-1.5 API
 */
export async function generateMusic(
  params: GenerateMusicParams
): Promise<MusicGenerationResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "MiniMax API key not configured",
    };
  }

  try {
    // Construct the prompt for music style
    let stylePrompt = "";
    if (params.style) {
      stylePrompt = `${params.style} style music`;
    }
    if (params.title) {
      stylePrompt = `${stylePrompt}. Title: "${params.title}"`;
    }
    if (!stylePrompt) {
      stylePrompt = "Create a song";
    }

    const requestBody: any = {
      model: "music-1.5",
      prompt: stylePrompt,
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: "mp3",
      },
    };

    // Add lyrics if provided and not instrumental
    if (params.prompt && !params.instrumental) {
      requestBody.lyrics = params.prompt;
    }

    console.log("[MiniMax] Generating music with prompt:", stylePrompt);
    console.log("[MiniMax] Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${MINIMAX_API_BASE}?GroupId=${MINIMAX_GROUP_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MiniMax] API error:", response.status, errorText);
      return {
        success: false,
        error: `API request failed: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    console.log("[MiniMax] API response:", JSON.stringify(data).substring(0, 200));

    // Check for API errors (status_code 0 means success)
    if (data.base_resp && data.base_resp.status_code !== 0) {
      return {
        success: false,
        error: data.base_resp.status_msg || "API error",
      };
    }

    // MiniMax music-1.5 may return audio as a hex string, base64 blob, or data URL
    if (data.data && data.data.audio) {
      const rawAudio = data.data.audio;
      const audioFormat = data.data.audio_format || data.data.format;
      const decodedAudio = decodeAudioPayload(rawAudio);
      const metadata = audioFormat
        ? resolveAudioMetadata(audioFormat)
        : decodedAudio.metadata;

      if (!decodedAudio.buffer.length) {
        throw new Error("Received empty audio payload from MiniMax");
      }

      const storage = await import("./storage");
      if (storage.isStorageConfigured()) {
        const timestamp = Date.now();
        const { url: audioUrl } = await storage.storagePut(
          `music/${timestamp}.${metadata.extension}`,
          decodedAudio.buffer,
          metadata.mimeType
        );

        return {
          success: true,
          audioUrl,
          status: "completed",
        };
      }

      const localUrl = await saveLocalAudio(decodedAudio.buffer, metadata.extension);
      return {
        success: true,
        audioUrl: localUrl,
        status: "completed",
      };
    }

    // Check for task ID (async generation)
    if (data.task_id) {
      return {
        success: true,
        taskId: data.task_id,
        status: "processing",
      };
    }

    return {
      success: false,
      error: "Unexpected API response format: " + JSON.stringify(data).substring(0, 100),
    };
  } catch (error) {
    console.error("[MiniMax] Error generating music:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Poll for task completion
 */
export async function pollTaskCompletion(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<MusicGenerationResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "MiniMax API key not configured",
    };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${MINIMAX_API_BASE}/${taskId}?GroupId=${MINIMAX_GROUP_ID}`,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error("[MiniMax] Poll error:", response.status);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      const data = await response.json();
      console.log(`[MiniMax] Poll attempt ${attempt + 1}:`, data);

      // Check status
      if (data.status === "Success" || data.status === "completed") {
        return {
          success: true,
          audioUrl: data.audio_url || data.file?.download_url,
          status: "completed",
        };
      }

      if (data.status === "Failed" || data.status === "failed") {
        return {
          success: false,
          error: data.error || "Generation failed",
          status: "failed",
        };
      }

      // Still processing, wait and retry
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.error("[MiniMax] Poll error:", error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return {
    success: false,
    error: "Timeout waiting for music generation",
    status: "failed",
  };
}

const LOCAL_AUDIO_SUBDIR = "audio";

async function saveLocalAudio(audioBuffer: Buffer, extension: string = DEFAULT_AUDIO_METADATA.extension) {
  const audioDir = ensureGeneratedSubdir(LOCAL_AUDIO_SUBDIR);
  const safeExtension =
    extension.replace(/[^a-z0-9]/gi, "") || DEFAULT_AUDIO_METADATA.extension;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
  const filePath = path.join(audioDir, fileName);
  await fs.writeFile(filePath, audioBuffer);
  return getGeneratedPublicPath(LOCAL_AUDIO_SUBDIR, fileName);
}
