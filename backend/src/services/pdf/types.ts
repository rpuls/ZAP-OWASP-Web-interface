import { ZapAlert } from '../../types';

export interface PdfGenerationOptions {
  targetUrl: string;
  startTime: Date;
}

export interface AlertGroup {
  risk: string;
  alerts: ZapAlert[];
  color: string;
}

export interface ReportData {
  alerts: ZapAlert[];
  options: PdfGenerationOptions;
}

export interface PdfColors {
  High: string;
  Medium: string;
  Low: string;
  Informational: string;
  text: string;
  border: string;
  background: string;
}

export const COLORS: PdfColors = {
  High: '#dc3545',
  Medium: '#fd7e14',
  Low: '#ffc107',
  Informational: '#0dcaf0',
  text: '#212529',
  border: '#dee2e6',
  background: '#ffffff'
};
