import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';
import { desc } from 'drizzle-orm';

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

const db = drizzle(connection, { schema, mode: 'default' });

const tracks = await db.select().from(schema.musicTracks)
  .orderBy(desc(schema.musicTracks.createdAt))
  .limit(1);

console.log(JSON.stringify(tracks, null, 2));

await connection.end();

