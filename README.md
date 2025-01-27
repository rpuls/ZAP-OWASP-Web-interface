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

Regular OWASP scans are essential for maintaining robust web security, especially for organizations aiming to comply with standards like ISO27001 or similar certifications.

### Why run in the cloud?
This cloud-based setup allows you to perform OWASP scans effortlessly without needing to download or install any software. It is particularly beneficial for users operating in environments with strict security policies that restrict installing third-party software, such as ZAP. By running in the cloud, you gain convenience, and compliance with organizational security requirements.  

### No-code Cloud Setup

Use one-click deploy template:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/template/dCh187?referralCode=-Yg50p)

This template automatically launches the required [ZAP docker container](https://hub.docker.com/r/zaproxy/zap-weekly), then builds the web interface and connect it to the API, so you don't have to do anything.

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
- **Railway-ready configuration**



### Local Setup

1. Clone the project: Launch on Railway and eject [watch how](https://www.youtube.com/watch?v=LJFek8JP8TE). Alternatively, clone this repo or fork it.
2. Install dependencies:
   - `pnpm install`
3. Rename `.env.template` to `.env`
4. Edit environment variables if needed, or leave default values:
```
PORT=3001
ZAP_API_URL=http://localhost:8080
PUBLIC_URL=http://localhost:3001
NODE_ENV=development
```
5. Start the development servers: `pnpm dev`


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


## Environment Variables

For Railway deployment, configure these environment variables:
```
NODE_ENV=production
ZAP_API_URL=${ZAP.RAILWAY_PRIVATE_DOMAIN}
ZAP_API_KEY=your-zap-api-key
RAILWAY_PUBLIC_DOMAIN # Automatically provided by Railway
```


The application will use:
- `RAILWAY_PUBLIC_DOMAIN` for the public-facing URL.
- `ZAP.RAILWAY_PRIVATE_DOMAIN` for internal service communication.

## Features

- Clean and intuitive user interface.
- Download PDF report of scan result.
- Backend proxy to ZAP service.

## API Endpoints

### Backend

#### Start a new scan:
`POST /api/v1/scans`
```
{
  "url": "https://example.com"
}
```


#### Get scan status and results:
`GET /api/v1/scans/:scanId`

```
{
  "scanId": "...",
  "status": number,
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
  ]
}
```


#### Generate PDF report:
`POST /api/v1/reports/generate`

```
{
  "scanId": "12"
}
```

<p align="center">
  <a href="https://funkyton.com/">
    A template by,
    <br><br>
    <picture>
      <img alt="FUNKYTON logo" src="https://res-5.cloudinary.com/hczpmiapo/image/upload/q_auto/v1/ghost-blog-images/funkyton-logo.png" width=200>
    </picture>
  </a>
</p>