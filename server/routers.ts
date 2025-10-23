import { COOKIE_NAME } from "../shared/const.js";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { nanoid } from "nanoid";

// Map database voice IDs to Replicate RVC model names
function getReplicateModelName(voiceId: string): string {
  const mapping: Record<string, string> = {
    "squidward": "Squidward",
    "mrkrabs": "MrKrabs",
    "plankton": "Plankton",
    "drake": "Drake",
    "vader": "Vader",
    "trump": "Trump",
    "donald-trump": "Trump",
    "biden": "Biden",
    "joe-biden": "Biden",
    "obama": "Obama",
    "barack-obama": "Obama",
    "guitar": "Guitar",
    "violin": "Voilin", // Note: Replicate has a typo
    "voilin": "Voilin", // Alternative spelling
  };
  return mapping[voiceId.toLowerCase()] || voiceId;
}
import { convertVoice, getTrendingVoices, getVoicesByCategory, searchVoices, VOICE_MODELS } from "./rvcApi.js";
import { createVoiceCover, getUserVoiceCovers, updateVoiceCover, getDb } from "./db.js";
import { voiceModels } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env.js";
import { uploadRouter } from "./uploadRouter.js";
import { downloadYouTubeAudio, isYouTubeUrl } from "./youtubeDownloader.js";

const MAX_LYRIC_DURATION_MINUTES = 4;
const ESTIMATED_WORDS_PER_MINUTE = 120;
const MAX_LYRIC_WORDS = MAX_LYRIC_DURATION_MINUTES * ESTIMATED_WORDS_PER_MINUTE;

const countWords = (text: string) =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const trimLyricsToWordLimit = (text: string) => {
  const original = text.trim();
  let trimmed = original;
  let words = countWords(trimmed);
  if (words <= MAX_LYRIC_WORDS) {
    return trimmed;
  }

  const lines = trimmed.split(/\r?\n/);
  while (lines.length > 0 && words > MAX_LYRIC_WORDS) {
    lines.pop();
    trimmed = lines.join("\n").trim();
    words = countWords(trimmed);
  }

  if (!trimmed) {
    trimmed = original;
    words = countWords(trimmed);
  }

  if (words > MAX_LYRIC_WORDS || !trimmed) {
    trimmed = original
      .split(/\s+/)
      .slice(0, MAX_LYRIC_WORDS)
      .join(" ");
  }

  return trimmed.trim();
};

export const appRouter = router({
  system: systemRouter,
  upload: uploadRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const resAny = ctx.res as {
        clearCookie?: (name: string, options?: Record<string, unknown>) => void;
      };
      resAny.clearCookie?.(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  music: router({
    generate: protectedProcedure
      .input(
        z.object({
          prompt: z.string(),
          title: z.string(),
          style: z.string(),
          model: z.enum(["V5", "V4_5PLUS", "V4_5", "V4", "V3_5"]),
          customMode: z.boolean(),
          instrumental: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createMusicTrack, updateMusicTrack } = await import("./db.js");
        const { generateMusic, pollTaskCompletion } = await import("./minimaxApi.js");
        
        const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create initial track record
        await createMusicTrack({
          id: trackId,
          userId: ctx.user.id,
          title: input.title,
          prompt: input.prompt,
          style: input.style,
          model: input.model,
          instrumental: input.instrumental ? "yes" : "no",
          status: "pending",
        });

        // Start music generation in background
        (async () => {
          try {
            console.log(`[Music Generation] Starting generation for track ${trackId}`);
            console.log(`[Music Generation] Input:`, JSON.stringify(input, null, 2));
            
            // Call MiniMax API to generate music
            const result = await generateMusic({
              prompt: input.prompt,
              title: input.title,
              style: input.style,
              instrumental: input.instrumental,
            });

            console.log(`[Music Generation] API result for ${trackId}:`, JSON.stringify(result, null, 2));

            if (!result.success) {
              console.error(`[Music Generation] Generation failed for ${trackId}:`, result.error);
              throw new Error(result.error || "Failed to start generation");
            }

            // Check if audio is returned directly
            if (result.audioUrl) {
              // Audio returned immediately
              console.log(`[Music Generation] Audio URL received for ${trackId}:`, result.audioUrl);
              await updateMusicTrack(trackId, {
                audioUrl: result.audioUrl,
                status: "completed",
              });
              console.log(`[Music Generation] Track ${trackId} marked as completed`);
            } else if (result.taskId) {
              // Async generation - need to poll
              console.log(`[Music Generation] Task ID received for ${trackId}:`, result.taskId);
              await updateMusicTrack(trackId, {
                taskId: result.taskId,
                status: "processing",
              });

              // Poll for completion
              console.log(`[Music Generation] Starting polling for ${trackId}`);
              const taskResult = await pollTaskCompletion(result.taskId);
              console.log(`[Music Generation] Polling result for ${trackId}:`, JSON.stringify(taskResult, null, 2));

              if (taskResult.success && taskResult.audioUrl) {
                console.log(`[Music Generation] Audio URL from polling for ${trackId}:`, taskResult.audioUrl);
                await updateMusicTrack(trackId, {
                  audioUrl: taskResult.audioUrl,
                  status: "completed",
                });
                console.log(`[Music Generation] Track ${trackId} marked as completed after polling`);
              } else {
                console.error(`[Music Generation] Polling failed for ${trackId}:`, taskResult.error);
                await updateMusicTrack(trackId, {
                  status: "failed",
                });
              }
            } else {
              console.error(`[Music Generation] No audio or task ID in response for ${trackId}`);
              throw new Error("No audio or task ID in response");
            }
          } catch (error) {
            console.error(`[Music Generation] Error for ${trackId}:`, error);
            console.error(`[Music Generation] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
            try {
              await updateMusicTrack(trackId, {
                status: "failed",
              });
            } catch (updateError) {
              console.error(`[Music Generation] Failed to update track status:`, updateError);
            }
          }
        })().catch(err => {
          console.error(`[Music Generation] Unhandled error in background process for ${trackId}:`, err);
        });
        
        return { success: true, trackId };
      }),

    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getUserMusicTracks } = await import("./db.js");
      return getUserMusicTracks(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const { getMusicTrackById } = await import("./db.js");
        const track = await getMusicTrackById(input.id);
        
        // Only allow users to view their own tracks
        if (track && track.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }
        
        return track;
      }),

    generateLyrics: protectedProcedure
      .input(
        z.object({
          style: z.string(),
          title: z.string().optional(),
          mood: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const canGenerateLyrics =
          (ENV.forgeFeaturesEnabled && !!ENV.forgeApiKey) ||
          !!ENV.openaiApiKey ||
          !!process.env.REPLICATE_API_TOKEN;
        if (!canGenerateLyrics) {
          throw new Error("Lyrics generation is not configured.");
        }

        const { invokeLLM } = await import("./_core/llm.js");

        const prompt = `You are a professional songwriter. Generate creative and engaging song lyrics in the ${input.style} style.${
          input.title ? ` The song title is "${input.title}".` : ""
        }${
          input.mood ? ` The mood/theme should be: ${input.mood}` : ""
        }

Generate complete song lyrics with proper structure including [Intro], [Verse], [Chorus], [Bridge], etc. tags.
Make the lyrics emotional, memorable, and suitable for the ${input.style} genre.
${input.title ? "" : "Also suggest a catchy title for the song."}
Ensure the lyrics can be performed within ${MAX_LYRIC_DURATION_MINUTES} minutes (about ${MAX_LYRIC_WORDS} words). Keep sections concise and avoid overly long verses.`;

        const songwriterSystemPrompt =
          "You are a professional songwriter who creates engaging, emotional, and memorable lyrics.";

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: songwriterSystemPrompt,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          const content = response.choices[0]?.message?.content;
          const contentText = typeof content === "string" ? content : "";
          
          // Extract title if not provided
          let generatedTitle = input.title;
          if (!generatedTitle) {
            const titleMatch = contentText.match(/Title:\s*["']?([^"'\n]+)["']?/i);
            if (titleMatch) {
              generatedTitle = titleMatch[1].trim();
            }
          }

          // Extract lyrics (remove title line if present)
          let lyrics = contentText.replace(/Title:\s*["']?[^"'\n]+["']?\n*/i, "").trim();

          let wordCount = countWords(lyrics);

          if (wordCount > MAX_LYRIC_WORDS) {
            try {
              const shortenResponse = await invokeLLM({
                messages: [
                  {
                    role: "system",
                    content: songwriterSystemPrompt,
                  },
                  {
                    role: "user",
                    content: `The following lyrics are approximately ${wordCount} words long, which is longer than the allowed ${MAX_LYRIC_WORDS} words (about ${MAX_LYRIC_DURATION_MINUTES} minutes of music). Rewrite them to fit within the limit while keeping the same structure and emotional tone. Return only the revised lyrics with their section headings.\n\n${lyrics}`,
                  },
                ],
              });

              const shortenContent = shortenResponse.choices[0]?.message?.content;
              const shortenText = typeof shortenContent === "string" ? shortenContent : "";

              if (shortenText.trim()) {
                const shortenedTitleMatch = shortenText.match(/Title:\s*["']?([^"'\n]+)["']?/i);
                if (shortenedTitleMatch) {
                  generatedTitle = generatedTitle ?? shortenedTitleMatch[1].trim();
                }

                const shortenedLyrics = shortenText.replace(/Title:\s*["']?[^"'\n]+["']?\n*/i, "").trim();
                if (shortenedLyrics) {
                  lyrics = shortenedLyrics;
                  wordCount = countWords(lyrics);
                }
              }
            } catch (shortenError) {
              console.warn("[LLM] Failed to shorten lyrics to time limit:", shortenError);
            }
          }

          if (wordCount > MAX_LYRIC_WORDS) {
            lyrics = trimLyricsToWordLimit(lyrics);
          }

          return {
            lyrics,
            title: generatedTitle,
          };
        } catch (error) {
          console.error("[LLM] Failed to generate lyrics:", error);
          throw new Error("Failed to generate lyrics");
        }
      }),
  }),

  // Voice cover router
  voiceCover: router({
    // Get all voice models
    getVoices: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(({ input }) => {
        return getVoicesByCategory(input?.category);
      }),

    // Get trending voices
    getTrending: publicProcedure.query(() => {
      return getTrendingVoices(5);
    }),

    // Search voices
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => {
        return searchVoices(input.query);
      }),

    // Get voice model by ID
    getVoiceById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        
        const result = await db.select().from(voiceModels).where(eq(voiceModels.id, input.id));
        return result[0] || null;
      }),

    // Create voice cover
    create: publicProcedure
      .input(
        z.object({
          voiceModelId: z.string(),
          audioUrl: z.string(),
          pitchChange: z.enum(["no-change", "male-to-female", "female-to-male"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Query database for voice model
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const voiceModelResult = await db.select().from(voiceModels).where(eq(voiceModels.id, input.voiceModelId));
        const voiceModel = voiceModelResult[0];
        
        if (!voiceModel) {
          throw new Error("Voice model not found");
        }

        const coverId = nanoid();
        
        // Handle YouTube URL if provided
        let processedAudioUrl = input.audioUrl;
        let songTitle: string | undefined;
        
        if (isYouTubeUrl(input.audioUrl)) {
          console.log(`[Voice Cover] Downloading YouTube audio: ${input.audioUrl}`);
          const downloadResult = await downloadYouTubeAudio(input.audioUrl);
          processedAudioUrl = downloadResult.url;
          songTitle = downloadResult.title;
          console.log(`[Voice Cover] YouTube audio downloaded to: ${processedAudioUrl}`);
          console.log(`[Voice Cover] Song title: ${songTitle}`);
        }
        
        // Use dev user if not authenticated
        const userId = ctx.user?.id || "dev-user";
        
        // Create database record
        await createVoiceCover({
          id: coverId,
          userId: userId,
          voiceModelId: input.voiceModelId,
          voiceModelName: voiceModel.name,
          songTitle: songTitle,
          originalAudioUrl: processedAudioUrl,
          status: "processing",
          pitchChange: input.pitchChange || "no-change",
        });

        // Start voice conversion
        const result = await convertVoice({
          songInput: processedAudioUrl,
          rvcModel: getReplicateModelName(voiceModel.id),
          pitchChange: input.pitchChange,
        });

        // Update with result
        try {
          const updateData = {
            convertedAudioUrl: result.audioUrl,
            status: result.status,
          };
          console.log(`[Voice Cover] Updating cover ${coverId} with data:`, JSON.stringify(updateData));
          console.log(`[Voice Cover] result object:`, JSON.stringify(result));
          await updateVoiceCover(coverId, updateData);
          console.log(`[Voice Cover] Successfully updated cover ${coverId}`);
        } catch (updateError) {
          console.error(`[Voice Cover] Failed to update cover ${coverId}:`, updateError);
          // Even if update fails, return the result so user can access the audio
          console.warn(`[Voice Cover] Returning result despite update failure`);
        }

        return {
          id: coverId,
          audioUrl: result.audioUrl,
          status: result.status,
        };
      }),

    // Get user's voice covers
    getUserCovers: protectedProcedure.query(async ({ ctx }) => {
      return await getUserVoiceCovers(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
