import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import crypto from "crypto";

interface GradientOptions {
  title: string;
  style?: string;
  seed?: string;
}

// Generate a deterministic color palette from a string
function stringToColors(str: string, count: number = 4): string[] {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  const colors: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const offset = i * 6;
    const r = parseInt(hash.substr(offset, 2), 16);
    const g = parseInt(hash.substr(offset + 2, 2), 16);
    const b = parseInt(hash.substr(offset + 4, 2), 16);
    
    // Enhance colors to make them more vibrant
    const enhancedR = Math.min(255, Math.floor(r * 1.2));
    const enhancedG = Math.min(255, Math.floor(g * 1.2));
    const enhancedB = Math.min(255, Math.floor(b * 1.2));
    
    colors.push(`rgb(${enhancedR}, ${enhancedG}, ${enhancedB})`);
  }
  
  return colors;
}

// Generate a random number from seed
function seededRandom(seed: string, index: number): number {
  const hash = crypto.createHash('md5').update(seed + index).digest('hex');
  return parseInt(hash.substr(0, 8), 16) / 0xffffffff;
}

export async function generateSongArtwork(options: GradientOptions): Promise<string> {
  const { title, style = "", seed = title } = options;
  
  // Create canvas
  const width = 800;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Generate color palette
  const seedString = `${title}-${style}-${seed}`;
  const colors = stringToColors(seedString, 5);
  
  // Determine gradient type based on seed
  const gradientType = Math.floor(seededRandom(seedString, 0) * 3);
  
  let gradient;
  
  if (gradientType === 0) {
    // Radial gradient
    const centerX = width * (0.3 + seededRandom(seedString, 1) * 0.4);
    const centerY = height * (0.3 + seededRandom(seedString, 2) * 0.4);
    const radius = Math.max(width, height) * 0.8;
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  } else if (gradientType === 1) {
    // Diagonal gradient
    const angle = seededRandom(seedString, 3) * Math.PI * 2;
    const x1 = width / 2 + Math.cos(angle) * width;
    const y1 = height / 2 + Math.sin(angle) * height;
    const x2 = width / 2 - Math.cos(angle) * width;
    const y2 = height / 2 - Math.sin(angle) * height;
    gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  } else {
    // Vertical/Horizontal gradient
    const isVertical = seededRandom(seedString, 4) > 0.5;
    if (isVertical) {
      gradient = ctx.createLinearGradient(0, 0, 0, height);
    } else {
      gradient = ctx.createLinearGradient(0, 0, width, 0);
    }
  }
  
  // Add color stops
  colors.forEach((color, index) => {
    const stop = index / (colors.length - 1);
    gradient.addColorStop(stop, color);
  });
  
  // Fill background with gradient
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add some abstract shapes for visual interest
  const shapeCount = Math.floor(seededRandom(seedString, 5) * 3) + 2;
  
  for (let i = 0; i < shapeCount; i++) {
    const shapeX = seededRandom(seedString, 10 + i * 4) * width;
    const shapeY = seededRandom(seedString, 11 + i * 4) * height;
    const shapeSize = (seededRandom(seedString, 12 + i * 4) * 0.3 + 0.2) * Math.min(width, height);
    const shapeColor = colors[Math.floor(seededRandom(seedString, 13 + i * 4) * colors.length)];
    
    // Random shape type
    const shapeType = Math.floor(seededRandom(seedString, 14 + i * 4) * 2);
    
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = shapeColor;
    
    if (shapeType === 0) {
      // Circle
      ctx.beginPath();
      ctx.arc(shapeX, shapeY, shapeSize, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Blob/irregular shape
      ctx.beginPath();
      const points = 8;
      for (let j = 0; j < points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const radius = shapeSize * (0.7 + seededRandom(seedString, 20 + i * 10 + j) * 0.6);
        const x = shapeX + Math.cos(angle) * radius;
        const y = shapeY + Math.sin(angle) * radius;
        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  
  ctx.globalAlpha = 1.0;
  
  // Generate filename
  const filename = `song-${crypto.createHash('md5').update(seedString).digest('hex')}.png`;
  const outputDir = path.join(process.cwd(), 'dist', 'public', 'artwork');
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, filename);
  
  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  // Return the public URL
  return `/artwork/${filename}`;
}

