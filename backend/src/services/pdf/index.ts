import PDFDocument from 'pdfkit';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { ZapAlert } from '../../types';
import { PdfGenerationOptions, COLORS } from './types';
import { groupAlertsByRisk, formatDate } from './utils';
import { PDFTemplateUtils } from './pdfTemplateUtils';

// Load logos
const zapLogoPath = path.join(__dirname, '../../assets/ZAP-logo.png');
const funkytonLogoPath = path.join(__dirname, '../../assets/funkyton-logo.png');

const TMP_DIR = path.join(os.tmpdir(), 'zap-reports');

// Ensure temp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

export async function generatePdfReport(alerts: ZapAlert[], options: PdfGenerationOptions): Promise<string> {
  // Sanitize URL for filename:
  // 1. Remove protocol (http://, https://)
  // 2. Replace unsafe characters with dashes
  // 3. Limit length to avoid too long filenames
  const sanitizeUrl = (url: string): string => {
    return url
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/[^a-zA-Z0-9-_.]/g, '-') // Replace unsafe chars with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .slice(0, 50); // Limit length
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: YYYY-MM-DDThhmm
  const sanitizedUrl = sanitizeUrl(options.targetUrl);
  const filename = `scan-report_${sanitizedUrl}_${timestamp}.pdf`;
  const filepath = path.join(TMP_DIR, filename);
  
  const doc = new PDFDocument({ 
    margin: 50,
    info: {
      Title: 'Security Scan Report',
      Author: 'ZAP Security Scanner',
      Subject: 'Web Application Security Report'
    }
  });

  // Register fonts
  doc.registerFont('Helvetica', 'Helvetica');
  doc.registerFont('Helvetica-Bold', 'Helvetica-Bold');
  doc.font('Helvetica');
  const stream = fs.createWriteStream(filepath);

  return new Promise((resolve, reject) => {
    // Handle stream errors
    stream.on('error', reject);
    doc.on('error', reject);

    // Wait for both the stream to finish and the doc to end
    let streamFinished = false;
    let docEnded = false;

    const tryResolve = () => {
      if (streamFinished && docEnded) {
        resolve(filepath);
      }
    };

    // When stream is finished
    stream.on('finish', () => {
      streamFinished = true;
      tryResolve();
    });

    // When PDF is done
    doc.on('end', () => {
      docEnded = true;
      tryResolve();
    });

    // Pipe PDF to file
    doc.pipe(stream);

    try {
      // Generate PDF content
      generateContent(doc, alerts, options);
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateContent(doc: PDFKit.PDFDocument, alerts: ZapAlert[], options: PdfGenerationOptions) {
  const pdfUtils = new PDFTemplateUtils(doc);
  let y = 100;

  // Title
  doc.fontSize(24).fillColor(COLORS.text);
  y = pdfUtils.addWrappedText('ZAP OWASP Scan Report', 50, y, 500, { align: 'center' });

  // Add ZAP logo
  const zapLogoSize = { width: 60, height: 60 };
  y += 20;
  doc.image(zapLogoPath, (doc.page.width - zapLogoSize.width) / 2, y, { 
    width: zapLogoSize.width,
    height: zapLogoSize.height
  });
  y += zapLogoSize.height + 20;

  // Scanned URL
  doc.fontSize(14).fillColor(COLORS.text);
  y = pdfUtils.addWrappedText(
    'Scanned URL:',
    50,
    y,
    500,
    { align: 'center' }
  );
  
  doc.font('Helvetica-Bold');
  y = pdfUtils.addWrappedText(
    options.targetUrl,
    50,
    y + 10,
    500,
    { align: 'center' }
  );
  doc.font('Helvetica');

  // Scan Information Box
  const boxY = y + 40;
  const boxPadding = 20;
  const boxWidth = 400;
  
  // Draw box with adjusted position
  doc
    .rect(
      (doc.page.width - boxWidth) / 2,
      boxY,
      boxWidth,
      80
    )
    .fillColor('#f8f9fa')
    .fill();

  // Scan Details
  doc.fontSize(12).fillColor(COLORS.text).font('Helvetica-Bold');
  y = pdfUtils.addWrappedText(
    'Scan Details',
    50,
    boxY + boxPadding,
    500,
    { align: 'center' }
  );

  y = pdfUtils.addWrappedText(
    `Started: ${formatDate(options.startTime)}`,
    50,
    y + 15,
    500,
    { align: 'center' }
  );

  // Summary
  const groups = groupAlertsByRisk(alerts);
  y = boxY + 100; // Reduced spacing after info box

  // Summary title
  doc.fontSize(14).font('Helvetica-Bold');
  y = pdfUtils.addWrappedText('Summary of Findings', 50, y, 500);
  doc.font('Helvetica');

  y += 15;

  groups.forEach(group => {
    doc.fontSize(12).fillColor(group.color).font('Helvetica-Bold');
    y = pdfUtils.addWrappedText(
      `${group.risk} Risk: ${group.alerts.length} finding${group.alerts.length === 1 ? '' : 's'}`,
      70,
      y,
      480
    );
    doc.font('Helvetica');
    y += 10;
  });

  // Position footer at bottom of page
  const funkytonLogoSize = { width: 200, height: 40.5 }; // Maintaining 1017:206 ratio
  const footerY = doc.page.height - 180; // Increased distance from bottom

  // Links and logo in footer
  // doc.fontSize(10).fillColor(COLORS.text);
  // pdfUtils.addWrappedText(
  //   'Read more: https://funkyton.com/zap-owasp-web-scan/ • Powered by: https://www.zaproxy.org/',
  //   50,
  //   footerY,
  //   500,
  //   { align: 'center' }
  // );

  // doc.image(funkytonLogoPath, (doc.page.width - funkytonLogoSize.width) / 2, footerY + 15, {
  //   width: funkytonLogoSize.width,
  //   height: funkytonLogoSize.height,
  //   align: 'center'
  // });
  
  // doc.fontSize(10).fillColor(COLORS.text);
  // pdfUtils.addWrappedText(
  //   'Made by Funkyton • https://funkyton.com/',
  //   50,
  //   footerY + funkytonLogoSize.height + 20,
  //   500,
  //   { align: 'center' }
  // );

  // Start new page for detailed findings
  groups.forEach(group => {
    doc.addPage();
    y = pdfUtils.addSection(`${group.risk} Risk Findings`, 50, group.color);

    group.alerts.forEach((alert, index) => {
      y = pdfUtils.checkPageBreak(y, 100); // Ensure minimum space for alert header

      // Alert title
      doc.fontSize(12).fillColor(group.color);
      y = pdfUtils.addWrappedText(`${index + 1}. ${alert.name}`, 50, y, 500);
      y += 15;

      // Description
      doc.fontSize(10).fillColor(COLORS.text);
      y = pdfUtils.addField('Description:', alert.description, y);

      // Solution
      y = pdfUtils.addField('Solution:', alert.solution, y);

      // Evidence
      if (alert.evidence) {
        y = pdfUtils.addField('Evidence:', alert.evidence, y, { preserveNewlines: true });
      }

      // URL
      y = pdfUtils.addField('URL:', alert.url, y);

      // References
      if (alert.reference) {
        y = pdfUtils.addField('References:', alert.reference, y, { 
          preserveNewlines: true,
          lineSpacing: 1.1
        });
      }

  y += 15; // Space between alerts
    });
  });

}
