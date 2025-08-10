import App from './app';
import { config, validateEnvironment } from './config/environment';
import { connectDatabase } from './config/database';

class Server {
  private app: App;
  private port: number;

  constructor() {
    this.port = config.PORT;
    this.app = new App();
  }

  public async start(): Promise<void> {
    try {
      // Validate environment variables
      console.log('🔧 Validating environment variables...');
      validateEnvironment();

      // Connect to database
      console.log('📦 Connecting to database...');
      await connectDatabase();

      // Start the server
      const server = this.app.getApp().listen(this.port, () => {
        console.log('🚀 Server started successfully!');
        console.log('┌─────────────────────────────────────────────┐');
        console.log(`│  🌟 Digital Competency Platform API        │`);
        console.log(`│  📡 Server: http://localhost:${this.port.toString().padEnd(14)} │`);
        console.log(`│  🌍 Environment: ${config.NODE_ENV.padEnd(20)} │`);
        console.log(`│  📚 Health Check: /health                   │`);
        console.log(`│  🔗 API Info: /api                         │`);
        console.log('└─────────────────────────────────────────────┘');

        if (config.NODE_ENV === 'development') {
          console.log('\n💡 Development Mode Features:');
          console.log('   • Hot reloading enabled');
          console.log('   • Detailed error messages');
          console.log('   • Morgan logging active');
          console.log('   • CORS configured for localhost:3000');
        }
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown(server);
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(server: any): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close((err: Error | null) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }

        console.log('✅ Server shut down successfully');
        // Database connection will be closed by database module
      });
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Start the server
const server = new Server();
server.start().catch(error => {
  console.error('❌ Critical error starting server:', error);
  process.exit(1);
});
