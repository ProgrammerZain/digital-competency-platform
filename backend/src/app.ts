import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/environment';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeBasicMiddleware();
    this.initializeRoutes();
  }

  private initializeBasicMiddleware(): void {
    // Basic CORS
    this.app.use(
      cors({
        origin: config.ALLOWED_ORIGINS,
        credentials: true,
      })
    );

    // Basic JSON parsing
    this.app.use(express.json());
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Digital Competency Platform API is running',
        timestamp: new Date().toISOString(),
      });
    });

    // API info endpoint
    this.app.get('/api', (_req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Welcome to Digital Competency Assessment Platform API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    this.app.all('/*splat', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
