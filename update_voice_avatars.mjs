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

console.log('Fetching current voice models...\n');
const [voices] = await connection.execute('SELECT * FROM voice_models');

console.log('Current voice models:');
voices.forEach(v => {
  console.log(`- ${v.name} (${v.category}) - Avatar: ${v.avatarUrl || 'NONE'}`);
});

// Avatar mapping
const avatarMap = {
  'Barack Obama': '/voice-avatars/obama.png',
  'Squidward': '/voice-avatars/squidward.jpg',
  'Plankton': '/voice-avatars/plankton.jpg',
  'Darth Vader': '/voice-avatars/darth-vader.jpg',
  'Joe Biden': '/voice-avatars/biden.jpg',
  'Donald Trump': '/voice-avatars/trump.jpg',
  'Drake': '/voice-avatars/drake.jpg'
};

console.log('\nUpdating avatar URLs...\n');

for (const [name, avatarUrl] of Object.entries(avatarMap)) {
  const [result] = await connection.execute(
    'UPDATE voice_models SET avatarUrl = ? WHERE name = ?',
    [avatarUrl, name]
  );
  
  if (result.affectedRows > 0) {
    console.log(`✅ Updated ${name} -> ${avatarUrl}`);
  } else {
    console.log(`⚠️  No voice model found for: ${name}`);
  }
}

console.log('\nVerifying updates...\n');
const [updatedVoices] = await connection.execute('SELECT name, avatarUrl FROM voice_models');
updatedVoices.forEach(v => {
  console.log(`${v.name}: ${v.avatarUrl || 'NO AVATAR'}`);
});

await connection.end();
console.log('\n✅ Done!');
