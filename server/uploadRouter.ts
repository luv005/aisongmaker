import { router, protectedProcedure } from "./_core/trpc.js";
import { z } from "zod";
import { storagePut } from "./storage.js";
import { nanoid } from "nanoid";

export const uploadRouter = router({
  // Upload audio file for voice cover
  uploadAudio: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        contentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Decode base64
      const buffer = Buffer.from(input.fileData, "base64");
      
      // Generate unique key
      const ext = input.fileName.split(".").pop() || "mp3";
      const key = `voice-covers/input-${nanoid()}.${ext}`;
      
      // Upload to S3
      const result = await storagePut(key, buffer, input.contentType);
      
      return {
        url: result.url,
        key: result.key,
      };
    }),
});

