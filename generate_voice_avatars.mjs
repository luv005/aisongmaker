import Replicate from "replicate";
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Connect to database
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }
});

console.log('✅ Connected to database\n');

// Fetch all voice models
const [voices] = await connection.execute('SELECT * FROM voice_models');
console.log(`Found ${voices.length} voice models\n`);

// Define cartoon style prompts for each character
const characterPrompts = {
  'Barack Obama': 'cute cartoon portrait of Barack Obama, chibi style, friendly smile, professional suit, simple background, kawaii aesthetic, digital art, high quality',
  'Joe Biden': 'cute cartoon portrait of Joe Biden, chibi style, friendly smile, professional suit, simple background, kawaii aesthetic, digital art, high quality',
  'Donald Trump': 'cute cartoon portrait of Donald Trump, chibi style, signature hairstyle, professional suit, simple background, kawaii aesthetic, digital art, high quality',
  'Drake': 'cute cartoon portrait of Drake rapper, chibi style, cool expression, modern outfit, simple background, kawaii aesthetic, digital art, high quality',
  'Squidward': 'cute cartoon portrait of Squidward Tentacles from SpongeBob, chibi style, blue-green color, big nose, simple background, kawaii aesthetic, digital art, high quality',
  'Plankton': 'cute cartoon portrait of Plankton from SpongeBob, chibi style, tiny green character, one eye, simple background, kawaii aesthetic, digital art, high quality',
  'Darth Vader': 'cute cartoon portrait of Darth Vader, chibi style, black helmet and armor, simple background, kawaii aesthetic, digital art, high quality',
  'Mr. Krabs': 'cute cartoon portrait of Mr. Krabs from SpongeBob, chibi style, red crab, big eyes, simple background, kawaii aesthetic, digital art, high quality',
  'Guitar (Instrumental)': 'cute cartoon illustration of an acoustic guitar, chibi style, musical notes around it, simple background, kawaii aesthetic, digital art, high quality',
  'Violin (Instrumental)': 'cute cartoon illustration of a violin, chibi style, musical notes around it, simple background, kawaii aesthetic, digital art, high quality',
};

// Function to generate image using Flux
async function generateAvatar(name, prompt) {
  console.log(`🎨 Generating avatar for: ${name}`);
  console.log(`   Prompt: ${prompt}\n`);
  
  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 90,
        },
      }
    );
    
    // Extract URL from output
    let imageUrl;
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      if (firstOutput && typeof firstOutput.toString === 'function') {
        imageUrl = firstOutput.toString();
      } else if (typeof firstOutput === 'string') {
        imageUrl = firstOutput;
      }
    } else if (typeof output === 'string') {
      imageUrl = output;
    }
    
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.error(`   ❌ Failed to extract URL for ${name}`);
      return null;
    }
    
    console.log(`   ✅ Generated: ${imageUrl}\n`);
    return imageUrl;
    
  } catch (error) {
    console.error(`   ❌ Error generating avatar for ${name}:`, error.message);
    return null;
  }
}

// Function to download image from URL
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Create output directory
const outputDir = join(__dirname, 'public', 'voice-avatars-generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🚀 Starting avatar generation...\n');
console.log('═══════════════════════════════════════════════════════\n');

// Generate avatars for each voice
const results = [];

for (const voice of voices) {
  const prompt = characterPrompts[voice.name];
  
  if (!prompt) {
    console.log(`⏭️  Skipping ${voice.name} (no prompt defined)\n`);
    continue;
  }
  
  // Generate image
  const imageUrl = await generateAvatar(voice.name, prompt);
  
  if (imageUrl) {
    // Download image
    const filename = voice.name.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '') + '.png';
    const filepath = join(outputDir, filename);
    
    try {
      console.log(`   📥 Downloading to: ${filename}`);
      await downloadImage(imageUrl, filepath);
      console.log(`   ✅ Saved to disk\n`);
      
      results.push({
        name: voice.name,
        id: voice.id,
        filename: filename,
        path: `/voice-avatars-generated/${filename}`,
        url: imageUrl,
        success: true
      });
    } catch (error) {
      console.error(`   ❌ Failed to download: ${error.message}\n`);
      results.push({
        name: voice.name,
        id: voice.id,
        url: imageUrl,
        success: false,
        error: error.message
      });
    }
  } else {
    results.push({
      name: voice.name,
      id: voice.id,
      success: false,
      error: 'Failed to generate image'
    });
  }
  
  // Add delay to avoid rate limiting
  console.log('   ⏳ Waiting 2 seconds before next generation...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log('═══════════════════════════════════════════════════════\n');
console.log('📊 Generation Summary:\n');

const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`✅ Successful: ${successful.length}`);
console.log(`❌ Failed: ${failed.length}`);
console.log(`📁 Total: ${results.length}\n`);

if (successful.length > 0) {
  console.log('✅ Successfully generated avatars:\n');
  successful.forEach(r => {
    console.log(`   - ${r.name}: ${r.path}`);
  });
  console.log('');
}

if (failed.length > 0) {
  console.log('❌ Failed to generate:\n');
  failed.forEach(r => {
    console.log(`   - ${r.name}: ${r.error}`);
  });
  console.log('');
}

// Update database with new avatar paths
console.log('💾 Updating database with new avatar paths...\n');

for (const result of successful) {
  try {
    await connection.execute(
      'UPDATE voice_models SET avatarUrl = ? WHERE id = ?',
      [result.path, result.id]
    );
    console.log(`   ✅ Updated ${result.name}`);
  } catch (error) {
    console.error(`   ❌ Failed to update ${result.name}:`, error.message);
  }
}

await connection.end();

console.log('\n✅ Done! Generated avatars are in:', outputDir);
console.log('\n📝 Next steps:');
console.log('   1. Review the generated images in public/voice-avatars-generated/');
console.log('   2. Rebuild the app: pnpm build');
console.log('   3. Copy avatars to dist: cp -r public/voice-avatars-generated dist/public/');
console.log('   4. Restart the server\n');

