<p align="center">
  <a href="https://github.com/your-repo/zap-owasp-web-interface">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/hczpmiapo/image/upload/v1737537436/Static%20assets/Logos/zap_logo_vhhimo.png">
      <source media="(prefers-color-scheme: light)" srcset="https://res.cloudinary.com/hczpmiapo/image/upload/v1737537436/Static%20assets/Logos/zap_logo_vhhimo.png">
      <img alt="ZAP OWASP Web Interface logo" src="https://res.cloudinary.com/hczpmiapo/image/upload/v1737537436/Static%20assets/Logos/zap_logo_vhhimo.png" width=100>
    </picture>
  </a>
  <a href="https://railway.com/template/dCh187?referralCode=-Yg50p">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="https://railway.app/brand/logo-light.svg">
      <source media="(prefers-color-scheme: dark)" srcset="https://railway.app/brand/logo-dark.svg">
      <img alt="Railway logo" src="https://railway.app/brand/logo-light.svg" width=100>
    </picture>
  </a>
</p>

<h2 align="center">
  ZAP OWASP Web Interface<br>
  <a href="https://railway.com/template/dCh187?referralCode=-Yg50p">One-click deploy on Railway!</a>
</h2>


## About this boilerplate
This repository provides a lightweight Node.js application with a modern web interface for interacting with the [ZAPROXY](https://www.zaproxy.org/) API. Simply launch the app, enter the URL of the website you want to scan for vulnerabilities, and click the Start Scan button. Once the scan is complete, you can view the results directly in the web interface or download a detailed PDF report.

⚠️ **Important Memory Requirements**:
- The ZAP service requires **at least 2GB of RAM** to function properly, especially for scanning larger sites
- Railway's free tier (500MB) is not sufficient for most scans
- For production use, consider upgrading to Railway's Hobby or Pro plan
- Memory usage increases with site complexity and depth of scanning

Regular OWASP scans are essential for maintaining robust web security, especially for organizations aiming to comply with standards like ISO27001 or similar certifications.

### Why run in the cloud?
This cloud-based setup allows you to perform OWASP scans effortlessly without needing to download or install any software. It is particularly beneficial for users operating in environments with strict security policies that restrict installing third-party software, such as ZAP. By running in the cloud, you gain convenience, and compliance with organizational security requirements.  

### No-code Cloud Setup

Use one-click deploy template:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/template/dCh187?referralCode=-Yg50p)

This template automatically launches the required [ZAP docker container](https://hub.docker.com/r/zaproxy/zap-weekly), then builds the web interface and connect it to the API, so you don't have to do anything. But, note that the ZAP service is memory-intensive - ensure your deployment environment has sufficient resources (minimum 2GB RAM) for reliable scanning, but for larger scans more memory might be required.


### Local Setup

1. Make sure to have Docker imgae `zaproxy/zap-stable:latest` running with the following start command:
```bash
docker run -u zap -p 8080:8080 zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true -config api.addrs.addr.name=.* -config api.addrs.addr.regex=true
```
2. Clone the project: Launch on Railway and eject [watch how](https://www.youtube.com/watch?v=LJFek8JP8TE). Alternatively, clone this repo or fork it.
3. Install dependencies:
   - `pnpm install`
4. Rename `.env.template` to `.env` (edit if needed)
5. Start the app `pnpm build && pnpm start` 

### System Requirements

- **Memory**: Minimum 2GB RAM for the ZAP service
- **Platform**: Any system capable of running Docker containers
- **Network**: Stable internet connection for scanning external sites

### Preconfigured Features & Integrations

- **Simple React frontend with Mantine UI components**
- **Two-phase security scanning**:
  - Spider scan to map the application
  - Active scan to find vulnerabilities
- **Real-time scan progress monitoring**
- **PDF report generation** with:
  - Summary of findings
  - Detailed vulnerability descriptions
  - Solutions and references
  - Risk-based categorization
- **Optional PostgreSQL database integration**:
  - Automatic scan persistence when database is available
  - Fallback to in-memory storage when no database is configured
  - Completed scans are stored in the database and cleared from memory
- **Railway-ready configuration**


#### Requirements

- Node.js >= v18.0.0
- pnpm >= v8.0.0
- A running [ZAP OWASP Docker instance](https://hub.docker.com/r/zaproxy/zap-weekly)

#### Commands

- `cd frontend && pnpm dev` to start the React frontend.
- `cd backend && pnpm dev` to start the Node.js backend.
- `pnpm build && pnpm start` to compile and run from compiled source.

### Project Structure

The project is organized as a monorepo containing both frontend and backend:

```
/
├── frontend/ # React frontend application
├── backend/ # Node.js/Express backend service
└── package.json # Root package.json for workspace management
```

## Features

- Clean and intuitive user interface.
- Download PDF report of scan result.
- Backend proxy to ZAP service.
- Optional database persistence for scan results.

### Database Integration

The application supports optional PostgreSQL database integration:

- **Flexible Operation**: Works seamlessly with or without a database connection
- **Railway Integration**: When deployed on Railway, the database is automatically configured
- **Local Development**: For local development, you can:
  - Run without a database (scans stored in memory only)
  - Connect to a local PostgreSQL instance
  - Connect to a remote PostgreSQL database

#### Configuring Database Connection

To enable database persistence, set the `DATABASE_URL` environment variable in your `.env` file:

```
DATABASE_URL=postgresql://username:password@localhost:5432/zapscans
```

When the application starts:
1. It checks for a valid `DATABASE_URL` environment variable
2. If found, it establishes a connection to the database
3. If not found or connection fails, it continues to operate using in-memory storage

#### Benefits of Database Persistence

- **Long-term Storage**: Scan results persist across application restarts
- **Memory Efficiency**: Completed scans are removed from memory after being stored in the database
- **Historical Data**: Access to historical scan results even after server restarts

## API Endpoints

### Backend

#### Start a new scan:
`POST /api/v1/scans`

Request:
```json
{
  "url": "https://example.com"
}
```

Response:
```json
{
  "uuid": "...",
  "status": "started",
  "url": "https://example.com"
}
```

#### Get scan status and results:
`GET /api/v1/scans/:uuid`

Response:
```json
{
  "uuid": "...",
  "status": number, // 0 for spider scanning, 1-100 for active scanning progress
  "isComplete": boolean,
  "results": [
    {
      "name": "...",
      "risk": "High|Medium|Low|Informational",
      "description": "...",
      "solution": "...",
      "reference": "...",
      "url": "..."
    }
  ],
  "error": {  // Only present if there's an error
    "message": "...",
    "code": "...",
    "details": "..."
  }
}
```

#### Generate PDF report:
`POST /api/v1/reports/generate`

Request:
```json
{
  "uuid": "..." // UUID of the scan
}
```

Response: Binary PDF file with proper Content-Disposition header for download.

<p align="center">
  <a href="https://funkyton.com/">
    A template by,
    <br><br>
    <picture>
      <img alt="FUNKYTON logo" src="https://res-5.cloudinary.com/hczpmiapo/image/upload/q_auto/v1/ghost-blog-images/funkyton-logo.png" width=200>
    </picture>
  </a>
</p>
