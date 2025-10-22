import Replicate from "replicate";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { voiceModels } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fetch from "node-fetch";

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

// Sample song URL - a short 15-30 second clip for preview
// Using a public domain song snippet
const SAMPLE_SONG_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// Voice model mappings to RVC model names
// These need to match actual RVC models available on Replicate
const VOICE_MODEL_MAPPINGS: Record<string, string> = {
  "taylor-swift": "Taylor Swift",
  "ariana-grande": "Ariana Grande",
  "billie-eilish": "Billie Eilish",
  "the-weeknd": "The Weeknd",
  "drake": "Drake",
  "michael-jackson": "Michael Jackson",
  "lady-gaga": "Lady Gaga",
  "ed-sheeran": "Ed Sheeran",
  "adele": "Adele",
  "bruno-mars": "Bruno Mars",
  "rihanna": "Rihanna",
  "justin-bieber": "Justin Bieber",
  "dua-lipa": "Dua Lipa",
  "shawn-mendes": "Shawn Mendes",
  "selena-gomez": "Selena Gomez",
  "eminem": "Eminem",
  "kanye-west": "Kanye West",
  "travis-scott": "Travis Scott",
  "post-malone": "Post Malone",
  "lil-nas-x": "Lil Nas X",
  "donald-trump": "Donald Trump",
  "morgan-freeman": "Morgan Freeman",
  "barack-obama": "Barack Obama",
  "elon-musk": "Elon Musk",
  "oprah-winfrey": "Oprah Winfrey",
  "spongebob": "SpongeBob SquarePants",
  "peter-griffin": "Peter Griffin",
  "homer-simpson": "Homer Simpson",
  "mickey-mouse": "Mickey Mouse",
  "bugs-bunny": "Bugs Bunny",
};

async function generateVoiceSample(voiceId: string, voiceName: string, rvcModelName: string) {
  console.log(`\n[${voiceId}] Generating voice sample for ${voiceName}...`);
  
  try {
    // Generate voice cover using Replicate
    console.log(`[${voiceId}] Calling Replicate API with model: ${rvcModelName}`);
    const output = await replicate.run(
      "zsxkib/realistic-voice-cloning:a0076ea190fb8c0f8d2c9a22d9e18b5f8d9f8c0f" as any,
      {
        input: {
          song_input: SAMPLE_SONG_URL,
          rvc_model: rvcModelName,
          pitch_change: "no-change",
          index_rate: 0.5,
          filter_radius: 3,
          rms_mix_rate: 0.25,
          protect: 0.33,
          output_format: "mp3",
        },
      }
    ) as unknown as string;

    console.log(`[${voiceId}] Replicate output URL: ${output}`);

    // Download the audio file
    console.log(`[${voiceId}] Downloading audio...`);
    const audioResponse = await fetch(output);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Upload to S3
    const s3Key = `voice-samples/${voiceId}-${Date.now()}.mp3`;
    console.log(`[${voiceId}] Uploading to S3: ${s3Key}`);
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
      })
    );

    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    console.log(`[${voiceId}] S3 URL: ${s3Url}`);

    // Update database with demo audio URL
    await db
      .update(voiceModels)
      .set({ demoAudioUrl: s3Url })
      .where(eq(voiceModels.id, voiceId));

    console.log(`[${voiceId}] ✅ Successfully generated and saved voice sample`);
    return { success: true, url: s3Url };
  } catch (error) {
    console.error(`[${voiceId}] ❌ Error:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function main() {
  console.log("🎤 Starting voice sample generation...\n");
  console.log(`Sample song: ${SAMPLE_SONG_URL}`);
  console.log(`Total voices to process: ${Object.keys(VOICE_MODEL_MAPPINGS).length}\n`);

  const results = [];

  for (const [voiceId, rvcModelName] of Object.entries(VOICE_MODEL_MAPPINGS)) {
    // Get voice name from database
    const voice = await db.query.voiceModels.findFirst({
      where: eq(voiceModels.id, voiceId),
    });

    if (!voice) {
      console.log(`[${voiceId}] ⚠️  Voice not found in database, skipping...`);
      continue;
    }

    const result = await generateVoiceSample(voiceId, voice.name, rvcModelName);
    results.push({ voiceId, voiceName: voice.name, ...result });

    // Add delay to avoid rate limiting
    console.log("⏳ Waiting 5 seconds before next generation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 GENERATION SUMMARY");
  console.log("=".repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${results.length}`);
  
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

