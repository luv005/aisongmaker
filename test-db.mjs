import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    const conn = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('✅ Connected successfully!');
    
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM voice_models');
    console.log('Voice models count:', rows[0].count);
    
    await conn.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();

