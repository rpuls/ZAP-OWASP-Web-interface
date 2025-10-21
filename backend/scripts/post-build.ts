import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables from root .env file
const rootEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: rootEnvPath });

// Debug: Log the DATABASE_URL
console.log('DATABASE_URL from post-build:', process.env.DATABASE_URL);

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

// Copy .env file to dist directory
const distEnvPath = path.join(__dirname, '../dist/.env');
if (fs.existsSync(rootEnvPath)) {
  fs.copyFileSync(rootEnvPath, distEnvPath);
  console.log(`✓ .env file copied from ${rootEnvPath} to ${distEnvPath}`);
} else {
  console.log(`! No .env file found at ${rootEnvPath}`);
}

// Check if DATABASE_URL is defined
if (process.env.DATABASE_URL) {
  console.log('Database URL found, initializing database...');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    
    try {
      // Generate Prisma client
      console.log('Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Push schema to database
      console.log('Pushing schema to database...');
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      
      // Verify database connection
      console.log('Verifying database connection...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      
      console.log('✓ Database initialized successfully');
    } catch (dbError) {
      console.error('! Database connection failed:', dbError);
      console.log('✓ Continuing without database persistence');
    }
  } catch (error) {
    console.error('! Failed to initialize database:', error);
    console.log('✓ Continuing without database persistence');
  }
} else {
  console.log('No DATABASE_URL found, skipping database initialization');
}
