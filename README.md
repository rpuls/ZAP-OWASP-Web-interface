# ZAP OWASP Web Interface

A modern web interface for the ZAP OWASP security testing tool. This application provides a user-friendly way to interact with a ZAP instance running in Docker, specifically designed to work with Railway's internal network.

## Project Structure

The project is organized as a monorepo containing both frontend and backend:

```
/
├── frontend/          # React frontend application
├── backend/          # Node.js/Express backend service
└── package.json      # Root package.json for workspace management
```

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- A running ZAP OWASP Docker instance

## Railway Requirements

This project is configured for Railway deployment with:
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Automatic build process via postinstall script
- Frontend static files served through the backend

The project uses a monorepo structure with pnpm workspaces:
- `pnpm-workspace.yaml` defines workspace packages
- `.npmrc` configures pnpm behavior
- `pnpm-lock.yaml` ensures consistent dependency versions

Railway will automatically:
- Detect the Node.js project
- Use pnpm for package management
- Run the build script
- Start the service using the start script

## Package Management

This project uses pnpm for dependency management and workspace handling. Make sure to install pnpm globally:

```bash
npm install -g pnpm@latest
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3001
ZAP_API_URL=http://localhost:8080  # URL of your ZAP instance
PUBLIC_URL=http://localhost:3001    # Local development URL
NODE_ENV=development
```

For Railway deployment, configure these environment variables:
```
NODE_ENV=production
ZAP_API_URL=${ZAP.RAILWAY_PRIVATE_DOMAIN}  # Internal communication with ZAP service
ZAP_API_KEY=your-zap-api-key               # API key for ZAP authentication
RAILWAY_PUBLIC_DOMAIN                       # Automatically provided by Railway
```

The ZAP_API_KEY will be automatically added to all requests to the ZAP service, both through:
- Direct API calls from the backend
- Proxied requests from the frontend

The application will use:
- RAILWAY_PUBLIC_DOMAIN for the public-facing URL
- ZAP.RAILWAY_PRIVATE_DOMAIN for internal service communication

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development servers:
   ```bash
   pnpm dev
   ```

This will start both the frontend and backend in development mode:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Railway Deployment

1. Push your code to a Git repository
2. Create a new Railway project
3. Add this repository as a service
4. Configure the environment variables in Railway:
   ```
   NODE_ENV=production
   ZAP_API_URL=${ZAP.RAILWAY_PRIVATE_DOMAIN}
   ```
   Note: RAILWAY_PUBLIC_DOMAIN is automatically provided by Railway
5. Deploy - The service will automatically:
   - Install dependencies using pnpm
   - Build frontend and backend
   - Start the server
   - Make the app available at RAILWAY_PUBLIC_DOMAIN

## Features

- Modern React frontend with Mantine UI components
- Two-phase security scanning:
  1. Spider scan to map the application
  2. Active scan to find vulnerabilities
- Real-time scan progress monitoring
- PDF report generation with:
  - Summary of findings
  - Detailed vulnerability descriptions
  - Solutions and references
  - Risk-based categorization
- Clean and intuitive user interface
- Backend proxy to ZAP service
- TypeScript for better type safety
- Railway-ready configuration

## API Endpoints

### Backend

- `POST /api/v1/scans`
  - Start a new scan (includes spider + active scan)
  - Body: `{ "url": "https://example.com" }`
  - Response: `{ "scanId": "...", "status": "started", "url": "..." }`

- `GET /api/v1/scans/:scanId`
  - Get scan status and results
  - Response: 
    ```json
    { 
      "scanId": "...", 
      "status": number,     // Progress percentage
      "isComplete": boolean,
      "results": [         // Only present when complete
        {
          "name": "...",
          "risk": "High|Medium|Low|Informational",
          "description": "...",
          "solution": "...",
          "reference": "...",
          "url": "..."
        }
      ]
    }
    ```

- `POST /api/v1/reports/generate`
  - Generate PDF report for a scan
  - Body: `{ "scanId": "..." }`
  - Response: PDF file download

## Future Enhancements

- Authentication system
- Scan history
- Advanced scan configuration options
- Custom scan policies
- Scheduled scans
- Result persistence
- Integration with CI/CD pipelines
