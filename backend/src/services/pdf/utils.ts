import PDFDocument from 'pdfkit';
import { ZapAlert } from '../../types';
import { AlertGroup, COLORS } from './types';

export function groupAlertsByRisk(alerts: ZapAlert[]): AlertGroup[] {
  const groups: Record<string, ZapAlert[]> = {
    High: [],
    Medium: [],
    Low: [],
    Informational: []
  };

  alerts.forEach(alert => {
    if (alert.risk in groups) {
      groups[alert.risk].push(alert);
    }
  });

  return Object.entries(groups)
    .filter(([_, alerts]) => alerts.length > 0)
    .map(([risk, alerts]) => ({
      risk,
      alerts,
      color: COLORS[risk as keyof typeof COLORS]
    }));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export interface WrappedTextOptions extends PDFKit.Mixins.TextOptions {
  lineSpacing?: number;  // Multiplier for line height
  preserveNewlines?: boolean;  // Whether to preserve explicit newlines in text
}

export function addWrappedText(
  doc: typeof PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: WrappedTextOptions = {}
): number {
  const {
    lineSpacing = 1,
    preserveNewlines = false,
    ...textOptions
  } = options;

  const baseLineHeight = doc.currentLineHeight();
  const effectiveLineHeight = baseLineHeight * lineSpacing;
  let currentY = y;

  // Handle text with explicit newlines
  if (preserveNewlines) {
    const paragraphs = text.toString().split('\n');
    paragraphs.forEach((paragraph, index) => {
      if (index > 0) currentY += effectiveLineHeight * 0.5; // Add half line spacing between paragraphs
      currentY = wrapParagraph(doc, paragraph, x, currentY, width, effectiveLineHeight, textOptions);
    });
  } else {
    currentY = wrapParagraph(doc, text.toString(), x, currentY, width, effectiveLineHeight, textOptions);
  }

  return currentY;
}

function wrapParagraph(
  doc: typeof PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
  options: PDFKit.Mixins.TextOptions
): number {
  const words = text.trim().split(' ');
  let line = '';
  let currentY = y;

  words.forEach(word => {
    const testLine = line + (line ? ' ' : '') + word;
    const testWidth = doc.widthOfString(testLine);

    if (testWidth > width && line !== '') {
      doc.text(line, x, currentY, options);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    doc.text(line, x, currentY, options);
    currentY += lineHeight;
  }

  return currentY;
}

export function createSection(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number,
  color: string = COLORS.text
): number {
  doc
    .fontSize(14)
    .fillColor(color)
    .text(title, 50, y);

  doc
    .moveTo(50, y + 25)
    .lineTo(550, y + 25)
    .strokeColor(color)
    .stroke();

  return y + 40;
}
