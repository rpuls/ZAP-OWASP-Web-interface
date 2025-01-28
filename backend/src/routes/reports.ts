import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { generatePdfReport } from '../services/pdf';
import { scanCache } from '../services/scanCache';

const router = Router();

interface GenerateReportRequest extends Request {
  body: {
    uuid: string;
  };
}

// POST /api/v1/reports/generate
router.post('/generate', async (req: GenerateReportRequest, res: Response) => {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'Missing uuid' });
    }

    // Get scan metadata from cache
    const scanMetadata = scanCache.getScanMetadata(uuid);
    if (!scanMetadata) {
      return res.status(404).json({ error: 'Scan metadata not found' });
    }

    // Get scan alerts from ZAP using the activeScanId from cache
    if (!scanMetadata.activeScanId) {
      return res.status(400).json({ error: 'No active scan ID found for this scan' });
    }

    // Get scan alerts from ZAP
    const alertsResponse = await axios.get('/JSON/core/view/alerts/', {
      params: {
        scanId: scanMetadata.activeScanId,
        start: 0,
        count: 100,
        riskId: ''  // Get all risk levels
      },
      baseURL: `http://${process.env.ZAP_API_URL}:8080`,
      headers: process.env.ZAP_API_KEY ? {
        'X-ZAP-API-Key': process.env.ZAP_API_KEY
      } : undefined,
      timeout: 30000,
      validateStatus: null
    });

    const alerts = alertsResponse.data.alerts;
    if (!alerts || !Array.isArray(alerts)) {
      return res.status(500).json({ error: 'Failed to fetch scan results' });
    }

    // Get scan status from ZAP
    const statusResponse = await axios.get('/JSON/ascan/view/status/', {
      params: { scanId: scanMetadata.activeScanId },
      baseURL: `http://${process.env.ZAP_API_URL}:8080`,
      headers: process.env.ZAP_API_KEY ? {
        'X-ZAP-API-Key': process.env.ZAP_API_KEY
      } : undefined,
      timeout: 30000,
      validateStatus: null
    });

    const scanDetails = {
      targetUrl: scanMetadata.url,
      startTime: scanMetadata.timestamp,
      status: statusResponse.data.status === '100' ? 'FINISHED' : 'IN PROGRESS'
    };
    const filepath = await generatePdfReport(alerts, scanDetails);
    
    // Debug: Check file size
    const stats = fs.statSync(filepath);
    console.log('Generated PDF file size:', stats.size, 'bytes');

    // Send file with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    // Use the same filename that was generated (extract from filepath)
    const filename = path.basename(filepath);
    // Ensure filename is properly encoded for Content-Disposition
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    
    const fileStream = fs.createReadStream(filepath);
    
    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('Error reading PDF file:', error);
      res.status(500).json({ error: 'Failed to read PDF file' });
      
      // Clean up on error
      fs.unlink(filepath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

    // Handle successful completion
    fileStream.on('end', () => {
      // Clean up after successful send
      fs.unlink(filepath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

    // Handle response errors
    res.on('error', (error) => {
      console.error('Error sending PDF:', error);
      // Clean up on error
      fs.unlink(filepath, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    });

    // Stream the file
    fileStream.pipe(res);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate report' 
    });
  }
});

export const reportsRouter = router;
