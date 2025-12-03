import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG to PNG conversion using canvas (Node.js)
const svgToPng = async (svgPath, pngPath, width, height) => {
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Use canvas to convert
  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Parse SVG and draw
  const { Image } = await import('canvas');
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(pngPath, buffer);
      console.log(`✓ Created ${pngPath}`);
      resolve();
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
  });
};

const icons = [
  { svg: 'apple-touch-icon-120x120.svg', png: 'apple-touch-icon-120x120.png', size: 120 },
  { svg: 'apple-touch-icon-152x152.svg', png: 'apple-touch-icon-152x152.png', size: 152 },
  { svg: 'apple-touch-icon-167x167.svg', png: 'apple-touch-icon-167x167.png', size: 167 },
  { svg: 'apple-touch-icon-180x180.svg', png: 'apple-touch-icon-180x180.png', size: 180 },
  { svg: 'apple-touch-icon-192x192.svg', png: 'apple-touch-icon-192x192.png', size: 192 },
  { svg: 'apple-touch-icon-512x512.svg', png: 'apple-touch-icon-512x512.png', size: 512 }
];

const publicDir = path.join(__dirname, '../public');

(async () => {
  try {
    for (const icon of icons) {
      const svgPath = path.join(publicDir, icon.svg);
      const pngPath = path.join(publicDir, icon.png);
      await svgToPng(svgPath, pngPath, icon.size, icon.size);
    }
    console.log('\n✅ All icons converted to PNG');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
