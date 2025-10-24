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

try {
  console.log('🔄 Adding avatarUrl column to voice_covers table...');
  
  await connection.execute(`
    ALTER TABLE voice_covers ADD COLUMN avatarUrl TEXT AFTER songTitle
  `);
  
  console.log('✅ Column added successfully\n');
  
  // Update existing voice covers with avatar URLs from their voice models
  console.log('🔄 Updating existing voice covers with avatar URLs...');
  
  await connection.execute(`
    UPDATE voice_covers vc
    JOIN voice_models vm ON vc.voiceModelId = vm.id
    SET vc.avatarUrl = vm.avatarUrl
    WHERE vm.avatarUrl IS NOT NULL
  `);
  
  const [result] = await connection.execute(`
    SELECT COUNT(*) as count FROM voice_covers WHERE avatarUrl IS NOT NULL
  `);
  
  console.log(`✅ Updated ${result[0].count} voice covers with avatar URLs\n`);
  
} catch (error) {
  if (error.code === 'ER_DUP_FIELDNAME') {
    console.log('⚠️  Column avatarUrl already exists, skipping...\n');
  } else {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

await connection.end();
console.log('✅ Migration complete!');

