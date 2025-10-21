import { createPool } from "mysql2/promise";

const pool = createPool({
  uri: "mysql://3tFHk44xMn9C8QF.root:7VKOR95pdXkikAQA@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test",
  ssl: { rejectUnauthorized: true }
});

async function checkTracks() {
  try {
    const [rows] = await pool.query("SELECT * FROM music_tracks ORDER BY createdAt DESC LIMIT 5");
    console.log("Recent music tracks:");
    console.log(JSON.stringify(rows, null, 2));
    await pool.end();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTracks();

