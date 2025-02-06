import fs from 'fs';
import path from 'path';

const copyDir = (src: string, dest: string) => {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// Paths are relative to project root
const srcAssetsDir = path.join(__dirname, '../src/assets');
const destAssetsDir = path.join(__dirname, '../dist/assets');

// Copy assets
if (fs.existsSync(srcAssetsDir)) {
  copyDir(srcAssetsDir, destAssetsDir);
  console.log('✓ Assets copied successfully');
} else {
  console.log('! No assets directory found');
}
