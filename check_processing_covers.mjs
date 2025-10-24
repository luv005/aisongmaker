import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

console.log('✅ Connected to database\n');

// Get all processing covers
const [processingCovers] = await connection.execute(`
  SELECT id, voiceModelName, songTitle, status, createdAt, convertedAudioUrl
  FROM voice_covers
  WHERE status = 'processing'
  ORDER BY createdAt DESC
`);

console.log(`Found ${processingCovers.length} covers in processing status:\n`);

processingCovers.forEach((cover, index) => {
  const age = Math.round((Date.now() - new Date(cover.createdAt).getTime()) / 1000 / 60);
  console.log(`${index + 1}. ${cover.voiceModelName} - ${cover.songTitle || 'Untitled'}`);
  console.log(`   ID: ${cover.id}`);
  console.log(`   Status: ${cover.status}`);
  console.log(`   Age: ${age} minutes`);
  console.log(`   Has Audio: ${cover.convertedAudioUrl ? 'Yes' : 'No'}`);
  console.log('');
});

// Get recent failed covers
const [failedCovers] = await connection.execute(`
  SELECT id, voiceModelName, songTitle, status, createdAt
  FROM voice_covers
  WHERE status = 'failed'
  ORDER BY createdAt DESC
  LIMIT 5
`);

if (failedCovers.length > 0) {
  console.log(`\nRecent failed covers (${failedCovers.length}):\n`);
  failedCovers.forEach((cover, index) => {
    console.log(`${index + 1}. ${cover.voiceModelName} - ${cover.songTitle || 'Untitled'}`);
    console.log(`   ID: ${cover.id}`);
    console.log(`   Failed at: ${cover.createdAt}`);
    console.log('');
  });
}

await connection.end();

