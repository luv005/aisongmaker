import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkVoiceSamples() {
  try {
    const conn = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const [rows] = await conn.execute('SELECT id, name, demoAudioUrl FROM voice_models ORDER BY id');
    
    console.log('Voice Models in Database:');
    console.log('========================\n');
    
    let withSamples = 0;
    let withoutSamples = 0;
    
    rows.forEach(row => {
      const hasDemo = row.demoAudioUrl ? '✅' : '❌';
      console.log(`${hasDemo} ${row.name} (${row.id})`);
      if (row.demoAudioUrl) {
        console.log(`   URL: ${row.demoAudioUrl}`);
        withSamples++;
      } else {
        withoutSamples++;
      }
      console.log('');
    });
    
    console.log('========================');
    console.log(`Total: ${rows.length} voices`);
    console.log(`With samples: ${withSamples}`);
    console.log(`Without samples: ${withoutSamples}`);
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVoiceSamples();

