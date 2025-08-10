import mongoose, { ConnectOptions } from 'mongoose';
import { config } from './environment';

const connectionOptions: ConnectOptions = {
  retryWrites: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  bufferCommands: false, // Disable mongoose buffering
};

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📦 Already connected to MongoDB');
      return;
    }

    try {
      console.log('📦 Connecting to MongoDB...');
      
      await mongoose.connect(config.MONGODB_URI, connectionOptions);
      
      this.isConnected = true;
      console.log('✅ MongoDB connected successfully');
      
      // Set up connection event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📦 MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  private setupEventListeners(): void {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      console.log('📦 Mongoose connected to MongoDB');
    });

    connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
    });

    connection.on('disconnected', () => {
      console.log('📦 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', async () => {
      await this.gracefulShutdown('SIGTERM');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error);
      await this.gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      await this.gracefulShutdown('unhandledRejection');
    });
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n📦 Received ${signal}. Gracefully shutting down...`);
    
    try {
      await this.disconnect();
      console.log('✅ Database connection closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getConnectionInfo(): object {
    const connection = mongoose.connection;
    return {
      isConnected: this.isConnected,
      readyState: connection.readyState,
      host: connection.host,
      port: connection.port,
      name: connection.name,
    };
  }
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();

// Export connection function for easy use
export const connectDatabase = async (): Promise<void> => {
  await database.connect();
};

// Export connection status check
export const isDatabaseConnected = (): boolean => {
  return database.getConnectionStatus();
};

export default database;
