import 'dotenv/config';
import Replicate from "replicate";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { voiceModels } from "./drizzle/schema.js";
import { eq, inArray } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// Using native fetch (Node.js 18+)

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(connection);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Sample song URL - a short clip for preview
const SAMPLE_SONG_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// Built-in voice models available in Replicate
const BUILTIN_VOICES = [
  { id: "drake", name: "Drake", category: "Rapper", rvcModel: "Drake" },
  { id: "trump", name: "Donald Trump", category: "Celebrity", rvcModel: "Trump" },
  { id: "biden", name: "Joe Biden", category: "Celebrity", rvcModel: "Biden" },
  { id: "obama", name: "Barack Obama", category: "Celebrity", rvcModel: "Obama" },
  { id: "vader", name: "Darth Vader", category: "Movie", rvcModel: "Vader" },
  { id: "squidward", name: "Squidward", category: "Cartoon", rvcModel: "Squidward" },
  { id: "mrkrabs", name: "Mr. Krabs", category: "Cartoon", rvcModel: "MrKrabs" },
  { id: "plankton", name: "Plankton", category: "Cartoon", rvcModel: "Plankton" },
  { id: "guitar", name: "Guitar (Instrumental)", category: "Music", rvcModel: "Guitar" },
  { id: "violin", name: "Violin (Instrumental)", category: "Music", rvcModel: "Voilin" }, // Note: typo in Replicate model name
];

async function clearOldVoices() {
  console.log("🗑️  Clearing old voice models from database...");
  
  // Delete all existing voice models
  await db.delete(voiceModels);
  
  console.log("✅ Old voice models cleared\n");
}

async function seedBuiltinVoices() {
  console.log("📝 Seeding built-in voice models...");
  
  for (const voice of BUILTIN_VOICES) {
    await db.insert(voiceModels).values({
      id: voice.id,
      name: voice.name,
      category: voice.category,
      avatar: `🎤`, // Simple emoji for now
      uses: Math.floor(Math.random() * 100000) + 50000, // Random uses
      likes: Math.floor(Math.random() * 500) + 200, // Random likes
      trending: Math.random() > 0.5,
      demoAudioUrl: null,
      createdAt: new Date(),
    });
    console.log(`  ✓ Added ${voice.name}`);
  }
  
  console.log("✅ Built-in voices seeded\n");
}

async function generateVoiceSample(voice: typeof BUILTIN_VOICES[0]) {
  console.log(`\n[${voice.id}] Generating voice sample for ${voice.name}...`);
  
  try {
    // Generate voice cover using Replicate
    console.log(`[${voice.id}] Calling Replicate API with model: ${voice.rvcModel}`);
    const output = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550" as any,
      {
        input: {
          song_input: SAMPLE_SONG_URL,
          rvc_model: voice.rvcModel,
          pitch_change: "no-change",
          index_rate: 0.5,
          filter_radius: 3,
          rms_mix_rate: 0.25,
          protect: 0.33,
          output_format: "mp3",
        },
      }
    ) as unknown as string;

    console.log(`[${voice.id}] Replicate output URL: ${output}`);

    // Download the audio file
    console.log(`[${voice.id}] Downloading audio...`);
    const audioResponse = await fetch(output);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Upload to S3
    const s3Key = `voice-samples/${voice.id}-${Date.now()}.mp3`;
    console.log(`[${voice.id}] Uploading to S3: ${s3Key}`);
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
        ACL: "public-read",
      })
    );

    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`[${voice.id}] S3 URL: ${s3Url}`);

    // Update database with demo audio URL
    await db
      .update(voiceModels)
      .set({ demoAudioUrl: s3Url })
      .where(eq(voiceModels.id, voice.id));

    console.log(`[${voice.id}] ✅ Successfully generated and saved voice sample`);
    return { success: true, url: s3Url };
  } catch (error) {
    console.error(`[${voice.id}] ❌ Error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function main() {
  console.log("🎤 Starting built-in voice sample generation...\n");
  console.log(`Sample song: ${SAMPLE_SONG_URL}`);
  console.log(`Total voices: ${BUILTIN_VOICES.length}`);
  console.log(`Estimated cost: $${(BUILTIN_VOICES.length * 0.036).toFixed(2)}\n`);

  // Clear old voices and seed new ones
  await clearOldVoices();
  await seedBuiltinVoices();

  const results = [];

  for (const voice of BUILTIN_VOICES) {
    const result = await generateVoiceSample(voice);
    results.push({ voiceId: voice.id, voiceName: voice.name, ...result });

    // Add delay to avoid rate limiting
    if (voice !== BUILTIN_VOICES[BUILTIN_VOICES.length - 1]) {
      console.log("⏳ Waiting 3 seconds before next generation...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 GENERATION SUMMARY");
  console.log("=".repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  console.log(`💰 Estimated cost: $${(successful * 0.036).toFixed(2)}`);
  
  if (failed > 0) {
    console.log("\n❌ Failed voices:");
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.voiceName} (${r.voiceId}): ${r.error}`);
    });
  }

  await connection.end();
  console.log("\n✨ Done!");
}

main().catch(console.error);

