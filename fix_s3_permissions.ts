import 'dotenv/config';
import { S3Client, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { voiceModels } from "./drizzle/schema.js";
import { isNotNull } from "drizzle-orm";

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(connection);

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function fixS3Permissions() {
  console.log("🔧 Fixing S3 permissions for voice samples...\n");
  
  // Get all voice models with demo audio URLs
  const voices = await db.select().from(voiceModels).where(isNotNull(voiceModels.demoAudioUrl));
  
  console.log(`Found ${voices.length} voices with demo audio URLs\n`);
  
  for (const voice of voices) {
    if (!voice.demoAudioUrl) continue;
    
    try {
      // Extract the S3 key from the URL
      const url = new URL(voice.demoAudioUrl);
      const key = url.pathname.substring(1); // Remove leading slash
      
      console.log(`[${voice.id}] Processing ${voice.name}...`);
      console.log(`  Key: ${key}`);
      
      // Check if object exists
      try {
        await s3Client.send(new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        }));
      } catch (error) {
        console.log(`  ❌ Object not found in S3, skipping...`);
        continue;
      }
      
      // Copy object to itself with public-read ACL
      await s3Client.send(new CopyObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        CopySource: `${process.env.S3_BUCKET}/${key}`,
        Key: key,
        ACL: "public-read",
        MetadataDirective: "COPY",
      }));
      
      console.log(`  ✅ Updated ACL to public-read\n`);
    } catch (error) {
      console.error(`  ❌ Error:`, error instanceof Error ? error.message : error);
      console.log('');
    }
  }
  
  await connection.end();
  console.log("✨ Done!");
}

fixS3Permissions().catch(console.error);

