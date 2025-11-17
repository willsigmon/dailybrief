import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import cron from "node-cron";
import { runDailyBriefingTask } from "../scheduledTasks";
import { setupProgressEndpoint } from "../progressEndpoint";
import { apiRateLimiter, rateLimitMiddleware } from "./rateLimiter";
import { logger } from "./logger";
import { closeDb } from "../db";
import { metrics } from "./metrics";
import { securityHeaders } from "./security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Security headers (apply to all routes)
  app.use(securityHeaders);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Rate limiting for API endpoints
  app.use("/api/trpc", rateLimitMiddleware(apiRateLimiter));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Progress SSE endpoint
  setupProgressEndpoint(app);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Metrics endpoint (Prometheus format)
  app.get('/metrics', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(metrics.getPrometheusFormat());
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`, { port, env: process.env.NODE_ENV });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await closeDb();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await closeDb();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  // Schedule daily briefing generation at 8 AM on weekdays (Monday-Friday)
  // Cron format: seconds minutes hours day-of-month month day-of-week
  // 0 0 8 * * 1-5 = At 8:00 AM, Monday through Friday
  cron.schedule('0 0 8 * * 1-5', async () => {
    logger.info('Triggering scheduled daily briefing generation');
    await runDailyBriefingTask();
  }, {
    timezone: 'America/New_York' // Adjust to your timezone
  });

  logger.info('Scheduled daily briefing generation for 8 AM weekdays (America/New_York timezone)');

  return server;
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
