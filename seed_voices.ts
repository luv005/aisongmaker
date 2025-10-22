import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { voiceModels } from "./drizzle/schema";

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(connection);

const voices = [
  // Trending/Popular Voices
  { id: "taylor-swift", name: "Taylor Swift", category: "Music", uses: 98000, likes: 457, isTrending: 1, avatarUrl: "https://i.pravatar.cc/300?img=1" },
  { id: "ariana-grande", name: "Ariana Grande", category: "Music", uses: 147000, likes: 573, isTrending: 1, avatarUrl: "https://i.pravatar.cc/300?img=2" },
  { id: "billie-eilish", name: "Billie Eilish", category: "Music", uses: 109000, likes: 200, isTrending: 1, avatarUrl: "https://i.pravatar.cc/300?img=3" },
  { id: "the-weeknd", name: "The Weeknd", category: "Music", uses: 71000, likes: 202, isTrending: 1, avatarUrl: "https://i.pravatar.cc/300?img=4" },
  { id: "drake", name: "Drake", category: "Rapper", uses: 85000, likes: 320, isTrending: 1, avatarUrl: "https://i.pravatar.cc/300?img=5" },
  
  // Music Artists
  { id: "michael-jackson", name: "Michael Jackson", category: "Music", uses: 139000, likes: 333, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=6" },
  { id: "lady-gaga", name: "Lady Gaga", category: "Music", uses: 151000, likes: 623, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=7" },
  { id: "ed-sheeran", name: "Ed Sheeran", category: "Music", uses: 67000, likes: 180, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=8" },
  { id: "adele", name: "Adele", category: "Music", uses: 92000, likes: 410, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=9" },
  { id: "bruno-mars", name: "Bruno Mars", category: "Music", uses: 78000, likes: 290, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=10" },
  { id: "rihanna", name: "Rihanna", category: "Music", uses: 103000, likes: 445, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=11" },
  { id: "justin-bieber", name: "Justin Bieber", category: "Music", uses: 88000, likes: 310, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=12" },
  { id: "dua-lipa", name: "Dua Lipa", category: "Music", uses: 76000, likes: 265, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=13" },
  { id: "shawn-mendes", name: "Shawn Mendes", category: "Music", uses: 54000, likes: 190, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=14" },
  { id: "selena-gomez", name: "Selena Gomez", category: "Music", uses: 69000, likes: 245, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=15" },
  
  // Rappers
  { id: "eminem", name: "Eminem", category: "Rapper", uses: 112000, likes: 520, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=16" },
  { id: "kanye-west", name: "Kanye West", category: "Rapper", uses: 95000, likes: 380, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=17" },
  { id: "travis-scott", name: "Travis Scott", category: "Rapper", uses: 87000, likes: 340, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=18" },
  { id: "post-malone", name: "Post Malone", category: "Rapper", uses: 79000, likes: 295, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=19" },
  { id: "lil-nas-x", name: "Lil Nas X", category: "Rapper", uses: 64000, likes: 230, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=20" },
  
  // Celebrities
  { id: "donald-trump", name: "Donald Trump", category: "Celebrity", uses: 183000, likes: 368, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=21" },
  { id: "morgan-freeman", name: "Morgan Freeman", category: "Celebrity", uses: 145000, likes: 612, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=22" },
  { id: "barack-obama", name: "Barack Obama", category: "Celebrity", uses: 128000, likes: 495, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=23" },
  { id: "elon-musk", name: "Elon Musk", category: "Celebrity", uses: 156000, likes: 580, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=24" },
  { id: "oprah-winfrey", name: "Oprah Winfrey", category: "Celebrity", uses: 98000, likes: 420, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=25" },
  
  // Cartoon Characters
  { id: "spongebob", name: "SpongeBob SquarePants", category: "Cartoon", uses: 229000, likes: 410, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=26" },
  { id: "peter-griffin", name: "Peter Griffin", category: "Cartoon", uses: 153000, likes: 600, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=27" },
  { id: "homer-simpson", name: "Homer Simpson", category: "Cartoon", uses: 134000, likes: 485, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=28" },
  { id: "mickey-mouse", name: "Mickey Mouse", category: "Cartoon", uses: 112000, likes: 390, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=29" },
  { id: "bugs-bunny", name: "Bugs Bunny", category: "Cartoon", uses: 89000, likes: 325, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=30" },
  
  // Anime Characters
  { id: "hatsune-miku", name: "Hatsune Miku", category: "Anime", uses: 204000, likes: 628, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=31" },
  { id: "goku", name: "Goku", category: "Anime", uses: 167000, likes: 540, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=32" },
  { id: "naruto", name: "Naruto Uzumaki", category: "Anime", uses: 145000, likes: 495, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=33" },
  { id: "luffy", name: "Monkey D. Luffy", category: "Anime", uses: 128000, likes: 445, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=34" },
  { id: "pikachu", name: "Pikachu", category: "Anime", uses: 198000, likes: 670, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=35" },
  
  // Game Characters
  { id: "minecraft-villager", name: "Minecraft Villager", category: "Game", uses: 623000, likes: 827, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=36" },
  { id: "mario", name: "Mario", category: "Game", uses: 234000, likes: 710, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=37" },
  { id: "sonic", name: "Sonic the Hedgehog", category: "Game", uses: 187000, likes: 565, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=38" },
  { id: "steve-minecraft", name: "Steve (Minecraft)", category: "Game", uses: 298000, likes: 645, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=39" },
  { id: "link-zelda", name: "Link (Zelda)", category: "Game", uses: 156000, likes: 480, isTrending: 0, avatarUrl: "https://i.pravatar.cc/300?img=40" },
];

console.log("Seeding voice models...");

for (const voice of voices) {
  try {
    await db.insert(voiceModels).values(voice);
    console.log(`✓ Added: ${voice.name}`);
  } catch (error) {
    console.log(`✗ Skipped: ${voice.name} (already exists)`);
  }
}

console.log("\nSeeding complete!");
await connection.end();

