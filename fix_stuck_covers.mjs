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

// Mark all processing covers older than 10 minutes as failed
const [result] = await connection.execute(`
  UPDATE voice_covers
  SET status = 'failed'
  WHERE status = 'processing'
  AND createdAt < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
`);

console.log(`✅ Marked ${result.affectedRows} stuck covers as failed\n`);

// Show remaining processing covers
const [remaining] = await connection.execute(`
  SELECT id, voiceModelName, songTitle, createdAt
  FROM voice_covers
  WHERE status = 'processing'
  ORDER BY createdAt DESC
`);

if (remaining.length > 0) {
  console.log(`Remaining processing covers: ${remaining.length}\n`);
  remaining.forEach((cover, index) => {
    console.log(`${index + 1}. ${cover.voiceModelName} - ${cover.songTitle || 'Untitled'}`);
    console.log(`   Created: ${cover.createdAt}\n`);
  });
} else {
  console.log('✅ No processing covers remaining');
}

await connection.end();

