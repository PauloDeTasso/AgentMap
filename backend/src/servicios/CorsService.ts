import { Request, Response, NextFunction } from 'express';

export interface CorsConfig {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

const DEFAULT_CORS: CorsConfig = {
  origins: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5173', 'http://localhost:4200', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:8084', 'http://localhost:8085'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

export class CorsService {
  private config: CorsConfig;

  constructor() {
    this.config = { ...DEFAULT_CORS };
  }

  getMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      if (origin && this.config.origins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', this.config.methods.join(', '));
        res.header('Access-Control-Allow-Headers', this.config.allowedHeaders.join(', '));
        res.header('Access-Control-Allow-Credentials', String(this.config.credentials));
        if (req.method === 'OPTIONS') {
          return res.sendStatus(204);
        }
      }
      next();
    };
  }

  getConfig(): CorsConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CorsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const corsService = new CorsService();

