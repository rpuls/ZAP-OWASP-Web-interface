# Persistence Layer

This module provides a persistence layer for storing scan metadata. It supports both in-memory caching and optional database persistence.

## Architecture

The persistence layer follows the Repository Pattern, which abstracts the data storage mechanism from the rest of the application. This allows the application to work with either in-memory storage or a database without changing the business logic.

### Components

- **PersistenceInterface**: Defines the contract that all persistence implementations must follow
- **PersistenceService**: The main implementation that uses in-memory storage and optionally persists completed scans to the database
- **DatabasePersistence**: A placeholder implementation for database operations using Prisma (not used directly)

## How It Works

1. All active scans are stored in memory for fast access
2. If a DATABASE_URL is defined in the environment:
   - Completed scans are persisted to the database
   - Scans are removed from memory after successful persistence
   - Historical scans can be retrieved from the database if not found in memory
3. If no DATABASE_URL is defined:
   - All scans remain in memory until explicitly cleaned up
   - No database operations are performed

## Usage

```typescript
import { persistence } from '../services/persistence';

// Create a new scan
const scanData = await persistence.createScan(url);

// Get scan metadata
const scanMetadata = await persistence.getScanMetadata(uuid);

// Update scan
await persistence.updateScan(uuid, {
  status: 'completed',
  progress: 100
});

// Clean old scans
await persistence.cleanOldScans(24); // Remove scans older than 24 hours
```

## Database Setup (Optional)

If you want to use database persistence:

1. Set the DATABASE_URL environment variable in your .env file
2. Run the Prisma migration: `npm run prisma:migrate`
3. Generate the Prisma client: `npm run prisma:generate`

The application will automatically detect the DATABASE_URL and use database persistence for completed scans.
