import { generatePdfReport } from '../src/services/pdf';
import { ZapAlert } from '../src/types';
import path from 'path';
import fs from 'fs';

// Ensure test-reports directory exists
const TEST_REPORTS_DIR = path.join(__dirname, '../test-reports');
if (!fs.existsSync(TEST_REPORTS_DIR)) {
  fs.mkdirSync(TEST_REPORTS_DIR, { recursive: true });
}

// Sample alerts for testing - one of each risk level
const sampleAlerts: ZapAlert[] = [
  {
    id: '1',
    name: 'SQL Injection',
    risk: 'High',
    confidence: 'High',
    description: 'SQL injection may be possible. The application appears to be vulnerable to SQL injection attacks. SQL injection occurs when user input is incorrectly filtered, allowing malicious SQL statements to be executed.',
    solution: 'Use parameterized queries, input validation, and proper escaping of user input. Consider using an ORM or prepared statements to prevent SQL injection vulnerabilities.',
    reference: 'https://owasp.org/www-community/attacks/SQL_Injection\nhttps://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
    url: 'https://example.com/users?id=1',
    evidence: 'Error message revealed: "You have an error in your SQL syntax; check the manual..."'
  },
  {
    id: '2',
    name: 'Cross-Site Scripting (XSS)',
    risk: 'Medium',
    confidence: 'High',
    description: 'Cross-site Scripting (XSS) is possible. The application does not properly encode or escape user input before displaying it back to users, potentially allowing malicious scripts to be executed in users\' browsers.',
    solution: 'Properly encode all user input before displaying it. Use context-appropriate encoding and consider implementing Content Security Policy (CSP) headers.',
    reference: 'https://owasp.org/www-community/attacks/xss/\nhttps://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
    url: 'https://example.com/profile',
    evidence: '<script>alert(1)</script> was reflected in the response'
  },
  {
    id: '3',
    name: 'Missing Security Headers',
    risk: 'Low',
    confidence: 'Medium',
    description: 'The application is missing several security headers that could help protect against common web vulnerabilities. Security headers provide an additional layer of security when properly implemented.',
    solution: 'Implement security headers such as Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security.',
    reference: 'https://owasp.org/www-project-secure-headers/\nhttps://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html',
    url: 'https://example.com',
    evidence: 'Response headers do not include recommended security headers'
  },
  {
    id: '4',
    name: 'Information Disclosure - Server Technology',
    risk: 'Informational',
    confidence: 'High',
    description: 'The server is revealing information about its technology stack through HTTP headers and error messages. This information could be useful to attackers in planning targeted attacks.',
    solution: 'Configure the server to minimize information disclosure in headers and error messages. Remove or customize server banners and error pages.',
    reference: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server',
    url: 'https://example.com',
    evidence: 'Server: Apache/2.4.41 (Ubuntu)\nX-Powered-By: PHP/7.4.3'
  }
];

// Generate test PDF in test-reports directory
generatePdfReport(sampleAlerts, {
  targetUrl: 'https://example.com',
  startTime: new Date(),
}).then(originalFilePath => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `test-report_${timestamp}.pdf`;
  const testFilePath = path.join(TEST_REPORTS_DIR, filename);
  
  // Move file from temp to test directory
  fs.copyFileSync(originalFilePath, testFilePath);
  fs.unlinkSync(originalFilePath);
  
  console.log('Test PDF generated at:', testFilePath);
}).catch(error => {
  console.error('Error generating test PDF:', error);
});
