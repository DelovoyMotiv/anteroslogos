/**
 * Generate Open Graph Image for Social Media
 * Production-grade OG image generator using SVG + sharp
 * Dimensions: 1200x630px (Facebook/Twitter optimal)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface OGImageConfig {
  width: number;
  height: number;
  outputPath: string;
  title: string;
  subtitle: string;
  tagline: string;
  brandName: string;
}

const config: OGImageConfig = {
  width: 1200,
  height: 630,
  outputPath: path.join(process.cwd(), 'public', 'images', 'og-image.jpg'),
  title: 'Knowledge Graph Engine for GEO',
  subtitle: 'AI Knowledge Infrastructure Platform',
  tagline: "Don't rank. Become the source.",
  brandName: 'Anóteros Lógos',
};

function generateSVG(config: OGImageConfig): string {
  const { width, height, title, subtitle, tagline, brandName } = config;

  // Grid pattern
  const gridSize = 40;
  const gridLines: string[] = [];
  for (let x = 0; x < width; x += gridSize) {
    gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(59, 130, 246, 0.1)" stroke-width="1"/>`);
  }
  for (let y = 0; y < height; y += gridSize) {
    gridLines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(59, 130, 246, 0.1)" stroke-width="1"/>`);
  }

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
      
      <!-- Grid pattern -->
      ${gridLines.join('\n      ')}
      
      <!-- Accent line -->
      <rect x="0" y="0" width="8" height="${height}" fill="#3B82F6"/>
      
      <!-- Accent corner -->
      <polygon points="${width},0 ${width},200 ${width - 200},0" fill="rgba(59, 130, 246, 0.2)"/>
      
      <!-- Brand name -->
      <text x="80" y="110" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#94A3B8">${brandName}</text>
      
      <!-- Title -->
      <text x="80" y="200" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#FFFFFF">${title}</text>
      
      <!-- Subtitle -->
      <text x="80" y="280" font-family="Arial, sans-serif" font-size="32" fill="#94A3B8">${subtitle}</text>
      
      <!-- Tagline -->
      <text x="80" y="550" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#3B82F6">${tagline}</text>
      
      <!-- Technology badges -->
      <g transform="translate(800, 490)">
        <!-- AID Protocol -->
        <rect x="0" y="0" width="110" height="35" rx="6" fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" stroke-width="2"/>
        <text x="10" y="23" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">AID Protocol</text>
      </g>
      
      <g transform="translate(920, 490)">
        <!-- A2A Protocol -->
        <rect x="0" y="0" width="110" height="35" rx="6" fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" stroke-width="2"/>
        <text x="8" y="23" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">A2A Protocol</text>
      </g>
      
      <g transform="translate(1040, 490)">
        <!-- RFC 9421 -->
        <rect x="0" y="0" width="90" height="35" rx="6" fill="rgba(59, 130, 246, 0.2)" stroke="#3B82F6" stroke-width="2"/>
        <text x="10" y="23" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">RFC 9421</text>
      </g>
    </svg>
  `;
}

async function generateOGImage(config: OGImageConfig): Promise<void> {
  const { outputPath } = config;
  const svg = generateSVG(config);
  const svgBuffer = Buffer.from(svg);

  try {
    await sharp(svgBuffer)
      .resize(config.width, config.height)
      .jpeg({ 
        quality: 95, 
        progressive: false,  // Baseline JPEG for Twitter/Telegram compatibility
        chromaSubsampling: '4:4:4'  // Better quality for social media
      })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`✓ OG image generated: ${outputPath}`);
    console.log(`  Dimensions: ${config.width}x${config.height}px`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('Failed to generate OG image:', error);
    throw error;
  }
}

// Generate image
generateOGImage(config)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Generation failed:', error);
    process.exit(1);
  });
