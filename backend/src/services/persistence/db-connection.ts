import { PrismaClient } from '@prisma/client';

/**
 * Singleton class to manage database connection
 */
class DbConnectionManager {
  private prisma: PrismaClient | null = null;
  private _isConnected: boolean = false;
  
  /**
   * Initialize the database connection
   * This should be called once during application startup
   * @param databaseUrl The database connection URL
   */
  async initialize(databaseUrl?: string): Promise<boolean> {
    // Only initialize if databaseUrl is provided
    if (!databaseUrl) {
      console.log('No DATABASE_URL provided, skipping database initialization');
      return false;
    }
    
    try {
      console.log('Initializing database connection...');
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      });
      
      // Test connection
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      
      this._isConnected = true;
      console.log('Database connection successful');
      return true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      this._isConnected = false;
      this.prisma = null;
      return false;
    }
  }
  
  /**
   * Get the Prisma client instance
   * Will return null if not connected
   */
  getPrismaClient(): PrismaClient | null {
    return this.prisma;
  }
  
  /**
   * Check if database is connected
   */
  get isConnected(): boolean {
    return this._isConnected;
  }
}

// Export singleton instance
export const dbConnection = new DbConnectionManager();
