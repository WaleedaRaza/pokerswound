# DEPLOYMENT STRATEGY

## Overview
This document outlines the complete deployment strategy for the poker engine, including infrastructure setup, CI/CD pipeline, monitoring, and scaling strategies. The deployment is designed for high availability, security, and performance.

## Infrastructure Architecture

### 1. Cloud Infrastructure
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                 │
│                              (Cloudflare)                                  │
└─────────────────────┬─────────────────────────────────┬─────────────────────┘
                      │                               │
            ┌─────────▼─────────┐         ┌─────────▼─────────┐
            │   WEB SERVERS     │         │  API SERVERS      │
            │   (Vercel)        │         │  (Render/Fly.io)  │
            └───────────────────┘         └───────────────────┘
                      │                               │
                      └───────────────┬───────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │           DATABASE                │
                    │         (Supabase)               │
                    └───────────────────────────────────┘
                                      │
                    ┌─────────────────▼─────────────────┐
                    │           CACHE                   │
                    │          (Redis)                 │
                    └───────────────────────────────────┘
```

### 2. Service Distribution
- **Frontend**: Vercel (React SPA)
- **Backend API**: Render or Fly.io (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis (optional, for performance)
- **CDN**: Cloudflare
- **Monitoring**: Sentry + Supabase Logs

## Environment Configuration

### 1. Environment Variables
```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://api.poker-engine.com
FRONTEND_URL=https://poker-engine.com

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# External APIs
YOUTUBE_API_KEY=your-youtube-api-key
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-client-secret

# Redis (optional)
REDIS_URL=redis://your-redis-instance

# Monitoring
SENTRY_DSN=your-sentry-dsn
SUPABASE_LOG_LEVEL=info

# Security
CORS_ORIGIN=https://poker-engine.com
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
```

### 2. Environment-Specific Configs
```typescript
// config/environments/production.ts
export const productionConfig = {
  database: {
    url: process.env.SUPABASE_URL,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000
    }
  },
  redis: {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: 3
  },
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: 'production'
    }
  }
};
```

## Containerization Strategy

### 1. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Docker Compose (Development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app

volumes:
  redis_data:
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    
    - name: Build Docker image
      run: docker build -t poker-engine:${{ github.sha }} .
    
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker tag poker-engine:${{ github.sha }} ${{ secrets.DOCKER_REGISTRY }}/poker-engine:${{ github.sha }}
        docker push ${{ secrets.DOCKER_REGISTRY }}/poker-engine:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v1.0.0
      with:
        service-id: ${{ secrets.RENDER_SERVICE_ID }}
        api-key: ${{ secrets.RENDER_API_KEY }}
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./frontend
```

### 2. Deployment Stages
```typescript
// scripts/deploy.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DeploymentManager {
  async deployToStaging(): Promise<void> {
    console.log('Deploying to staging...');
    
    // Run tests
    await this.runTests();
    
    // Build application
    await this.buildApplication();
    
    // Deploy to staging environment
    await this.deployToEnvironment('staging');
    
    // Run smoke tests
    await this.runSmokeTests('staging');
  }
  
  async deployToProduction(): Promise<void> {
    console.log('Deploying to production...');
    
    // Run full test suite
    await this.runFullTestSuite();
    
    // Build application
    await this.buildApplication();
    
    // Deploy to production environment
    await this.deployToEnvironment('production');
    
    // Run health checks
    await this.runHealthChecks();
    
    // Monitor deployment
    await this.monitorDeployment();
  }
  
  private async runTests(): Promise<void> {
    await execAsync('npm test');
  }
  
  private async buildApplication(): Promise<void> {
    await execAsync('npm run build');
  }
  
  private async deployToEnvironment(environment: string): Promise<void> {
    const command = environment === 'production' 
      ? 'npm run deploy:prod'
      : 'npm run deploy:staging';
    
    await execAsync(command);
  }
}
```

## Monitoring and Observability

### 1. Application Monitoring
```typescript
// monitoring/application-monitor.ts
import * as Sentry from '@sentry/node';

class ApplicationMonitor {
  constructor() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });
  }
  
  captureError(error: Error, context?: any): void {
    Sentry.captureException(error, {
      extra: context
    });
  }
  
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
  }
  
  startTransaction(name: string, operation: string): Sentry.Transaction {
    return Sentry.startTransaction({
      name,
      op: operation
    });
  }
}
```

### 2. Health Checks
```typescript
// health/health-checker.ts
class HealthChecker {
  async checkDatabaseHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      await this.databaseService.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  async checkRedisHealth(): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      await this.redisService.ping();
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  async checkExternalAPIs(): Promise<HealthStatus> {
    const checks = [
      this.checkYouTubeAPI(),
      this.checkTwitchAPI()
    ];
    
    const results = await Promise.allSettled(checks);
    const healthy = results.every(result => 
      result.status === 'fulfilled' && result.value.healthy
    );
    
    return {
      healthy,
      details: results,
      timestamp: new Date()
    };
  }
}
```

### 3. Performance Monitoring
```typescript
// monitoring/performance-monitor.ts
class PerformanceMonitor {
  private metrics = {
    responseTimes: [] as number[],
    errorRates: [] as number[],
    throughput: [] as number[]
  };
  
  recordResponseTime(time: number): void {
    this.metrics.responseTimes.push(time);
    
    // Keep only last 1000 measurements
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }
  
  recordError(): void {
    this.metrics.errorRates.push(Date.now());
    
    // Keep only errors from last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics.errorRates = this.metrics.errorRates.filter(
      timestamp => timestamp > oneHourAgo
    );
  }
  
  getAverageResponseTime(): number {
    if (this.metrics.responseTimes.length === 0) return 0;
    
    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.metrics.responseTimes.length;
  }
  
  getErrorRate(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = this.metrics.errorRates.filter(
      timestamp => timestamp > oneHourAgo
    ).length;
    
    return recentErrors / 60; // errors per minute
  }
}
```

## Security Configuration

### 1. SSL/TLS Configuration
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name poker-engine.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Security Headers
```typescript
// middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),
  
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  })
];
```

## Backup and Recovery

### 1. Database Backup Strategy
```typescript
// backup/backup-manager.ts
class BackupManager {
  async createBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString();
    const backupId = `backup-${timestamp}`;
    
    try {
      // Create database backup
      const backup = await this.databaseService.createBackup(backupId);
      
      // Upload to cloud storage
      await this.uploadToCloudStorage(backup, backupId);
      
      // Log backup creation
      await this.logBackupCreation(backupId, backup);
      
      return {
        success: true,
        backupId,
        timestamp,
        size: backup.size
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp
      };
    }
  }
  
  async restoreBackup(backupId: string): Promise<RestoreResult> {
    try {
      // Download from cloud storage
      const backup = await this.downloadFromCloudStorage(backupId);
      
      // Restore database
      await this.databaseService.restoreBackup(backup);
      
      // Verify restoration
      await this.verifyRestoration();
      
      return {
        success: true,
        backupId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
```

### 2. Disaster Recovery Plan
```typescript
// disaster-recovery/disaster-recovery-manager.ts
class DisasterRecoveryManager {
  async initiateDisasterRecovery(): Promise<RecoveryResult> {
    console.log('Initiating disaster recovery...');
    
    try {
      // 1. Assess damage
      const damageAssessment = await this.assessDamage();
      
      // 2. Activate backup systems
      await this.activateBackupSystems();
      
      // 3. Restore from latest backup
      const latestBackup = await this.getLatestBackup();
      await this.restoreFromBackup(latestBackup);
      
      // 4. Verify system integrity
      await this.verifySystemIntegrity();
      
      // 5. Notify stakeholders
      await this.notifyStakeholders('System restored successfully');
      
      return {
        success: true,
        recoveryTime: Date.now(),
        backupUsed: latestBackup.id
      };
    } catch (error) {
      await this.notifyStakeholders(`Recovery failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        recoveryTime: Date.now()
      };
    }
  }
}
```

## Scaling Strategy

### 1. Horizontal Scaling
```typescript
// scaling/auto-scaler.ts
class AutoScaler {
  private readonly MIN_INSTANCES = 2;
  private readonly MAX_INSTANCES = 10;
  private readonly SCALE_UP_THRESHOLD = 0.8; // 80% CPU
  private readonly SCALE_DOWN_THRESHOLD = 0.3; // 30% CPU
  
  async checkScalingNeeds(): Promise<ScalingDecision> {
    const metrics = await this.getSystemMetrics();
    
    if (metrics.cpuUsage > this.SCALE_UP_THRESHOLD && 
        metrics.instanceCount < this.MAX_INSTANCES) {
      return {
        action: 'scale_up',
        reason: 'High CPU usage',
        currentInstances: metrics.instanceCount,
        targetInstances: metrics.instanceCount + 1
      };
    }
    
    if (metrics.cpuUsage < this.SCALE_DOWN_THRESHOLD && 
        metrics.instanceCount > this.MIN_INSTANCES) {
      return {
        action: 'scale_down',
        reason: 'Low CPU usage',
        currentInstances: metrics.instanceCount,
        targetInstances: metrics.instanceCount - 1
      };
    }
    
    return {
      action: 'maintain',
      reason: 'CPU usage within normal range',
      currentInstances: metrics.instanceCount,
      targetInstances: metrics.instanceCount
    };
  }
  
  async executeScaling(decision: ScalingDecision): Promise<void> {
    if (decision.action === 'scale_up') {
      await this.scaleUp(decision.targetInstances);
    } else if (decision.action === 'scale_down') {
      await this.scaleDown(decision.targetInstances);
    }
  }
}
```

### 2. Load Balancing
```typescript
// load-balancing/load-balancer.ts
class LoadBalancer {
  private instances: Instance[] = [];
  private currentIndex = 0;
  
  addInstance(instance: Instance): void {
    this.instances.push(instance);
  }
  
  removeInstance(instanceId: string): void {
    this.instances = this.instances.filter(
      instance => instance.id !== instanceId
    );
  }
  
  getNextInstance(): Instance | null {
    if (this.instances.length === 0) {
      return null;
    }
    
    // Round-robin load balancing
    const instance = this.instances[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.instances.length;
    
    return instance;
  }
  
  async healthCheck(): Promise<HealthCheckResult[]> {
    const checks = this.instances.map(async (instance) => {
      try {
        const response = await fetch(`${instance.url}/health`);
        const healthy = response.ok;
        
        return {
          instanceId: instance.id,
          healthy,
          responseTime: Date.now() - Date.now(),
          lastCheck: new Date()
        };
      } catch (error) {
        return {
          instanceId: instance.id,
          healthy: false,
          error: error.message,
          lastCheck: new Date()
        };
      }
    });
    
    return Promise.all(checks);
  }
}
```

## Deployment Checklist

### 1. Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup systems verified

### 2. Deployment Checklist
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Verify all functionality
- [ ] Check performance metrics
- [ ] Deploy to production
- [ ] Monitor deployment
- [ ] Verify health checks
- [ ] Update DNS if needed

### 3. Post-Deployment Checklist
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify user experience
- [ ] Update documentation
- [ ] Notify stakeholders
- [ ] Schedule rollback if needed

This comprehensive deployment strategy ensures reliable, secure, and scalable deployment of the poker engine with proper monitoring, backup, and recovery procedures. 