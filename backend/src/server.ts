import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { scanRouter } from './routes/scan';
import { reportsRouter } from './routes/reports';
import { dbConnection } from './services/persistence/db-connection';

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Debug: Log the DATABASE_URL
console.log('DATABASE_URL from env:', process.env.DATABASE_URL);

// Initialize database connection
(async () => {
  await dbConnection.initialize(process.env.DATABASE_URL);
})();

const app = express();
const port = process.env.PORT || 8080;  // Railway default port

// Get public URL from environment
const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.PUBLIC_URL || 'http://localhost:3001';

// Middleware
app.use(cors({
  origin: true,  // Allow all origins in production
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));  // Increase payload limit for large scan results

// Log all requests
app.use((req, res, next) => {
  process.env.VERBOSE && console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/v1/scans', scanRouter);
app.use('/api/v1/reports', reportsRouter);

// ZAP proxy setup (will be configured via environment variables)
const zapTarget = `http://${process.env.ZAP_API_URL}:8080`;
const zapApiKey = process.env.ZAP_API_KEY;

app.use(
  '/zap',
  createProxyMiddleware({
    target: zapTarget,
    changeOrigin: true,
    pathRewrite: {
      '^/zap': '', // Remove /zap prefix when forwarding to target
    },
    onProxyReq: (proxyReq, req) => {
      if (zapApiKey) {
        proxyReq.setHeader('X-ZAP-API-Key', zapApiKey);
      }

      process.env.VERBOSE && console.log('Proxying request to ZAP:', {
        url: zapTarget + proxyReq.path,
        method: proxyReq.method,
        headers: proxyReq.getHeaders(),
        path: proxyReq.path
      });
    }
  })
);

// Serve frontend static files
const distPath = path.resolve(__dirname, '../../frontend/dist');
console.log('Frontend dist path:', distPath);
if (!fs.existsSync(distPath)) {
  console.error('Frontend dist directory not found at:', distPath);
} else {
  console.log('Frontend dist directory found');
}

app.use(express.static(distPath));

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  const indexPath = path.resolve(distPath, 'index.html');
  console.log('Request for:', req.path);
  console.log('Trying to serve:', indexPath);
  
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(500).send('Frontend files not found');
  }
  res.sendFile(indexPath);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Public URL: ${publicUrl}`);
  console.log(`ZAP proxy target: ${zapTarget}`);
});
