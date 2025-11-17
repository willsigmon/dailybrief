# Deployment Guide

## Prerequisites

- Node.js 18+ and pnpm
- MySQL 8.0+ or TiDB
- Environment variables configured

## Environment Setup

### 1. Create `.env` file

```bash
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Authentication
COOKIE_SECRET=your-secret-key-here
OAUTH_SERVER_URL=https://oauth.manus.im
APP_ID=your-app-id

# LLM APIs
FORGE_API_KEY=your-forge-key
GEMINI_API_KEY=your-gemini-key  # Optional
XAI_API_KEY=your-xai-key  # Optional
SONAR_API_KEY=your-sonar-key  # Optional

# MCP Integration
USE_MCP_CLI=true  # Set to false to disable MCP CLI

# Server
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Database Pool
DB_POOL_SIZE=10
DB_QUEUE_LIMIT=0
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run Database Migrations

```bash
pnpm db:push
```

This will:
- Generate migration files from schema
- Apply migrations to database
- Create all tables and indexes

### 4. Build Application

```bash
pnpm build
```

This compiles:
- Frontend React app (Vite)
- Backend Express server (esbuild)

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name daily-briefing

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Expose port
EXPOSE 3000

# Start
CMD ["node", "dist/index.js"]
```

Build and run:

```bash
docker build -t daily-briefing .
docker run -p 3000:3000 --env-file .env daily-briefing
```

### Using Systemd

Create `/etc/systemd/system/daily-briefing.service`:

```ini
[Unit]
Description=HTI Daily Briefing
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/daily-briefing
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable daily-briefing
sudo systemctl start daily-briefing
```

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/progress {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

## Health Checks

### Application Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### Metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

Returns Prometheus-format metrics.

## Monitoring

### Log Files

Logs are written to:
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs

Log rotation is handled automatically (5MB max, 5 files).

### Metrics

Prometheus metrics available at `/metrics`:
- Briefing generation success/failure rates
- LLM API latency and error rates
- Database operation performance
- Cache hit/miss rates

### Alerts

Set up alerts for:
- Briefing generation failures
- High error rates
- Slow response times
- Database connection issues

## Backup

### Database Backup

```bash
mysqldump -u user -p database_name > backup.sql
```

### Automated Backups

Set up cron job:

```bash
0 2 * * * mysqldump -u user -p database_name > /backups/daily-briefing-$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Database Connection Issues

1. Check `DATABASE_URL` format
2. Verify database is accessible
3. Check connection pool settings
4. Review logs for connection errors

### MCP Integration Not Working

1. Verify `manus-mcp-cli` is installed
2. Check `USE_MCP_CLI` environment variable
3. Review MCP command execution logs
4. Application will degrade gracefully if MCP unavailable

### High Memory Usage

1. Reduce `DB_POOL_SIZE`
2. Check for memory leaks in logs
3. Monitor cache size
4. Review batch operation sizes

### Slow Briefing Generation

1. Check LLM API response times
2. Review database query performance
3. Verify indexes are being used
4. Check cache hit rates
5. Monitor MCP command execution times

## Scaling

### Horizontal Scaling

The application is stateless and can be scaled horizontally:

1. Deploy multiple instances
2. Use load balancer (Nginx/HAProxy)
3. Share session storage (Redis) if needed
4. Database connection pooling handles multiple instances

### Database Scaling

- Use read replicas for queries
- Optimize slow queries
- Add indexes as needed
- Consider partitioning for large tables

## Security Checklist

- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Input sanitization active
- [ ] HTTPS enabled (via reverse proxy)
- [ ] Database credentials secured
- [ ] API keys stored securely
- [ ] Logs don't contain sensitive data
- [ ] Regular security updates

## Maintenance

### Regular Tasks

1. **Daily**: Monitor briefing generation success
2. **Weekly**: Review error logs
3. **Monthly**: Database optimization
4. **Quarterly**: Security audit

### Updates

```bash
# Update dependencies
pnpm update

# Run tests
pnpm test

# Check for breaking changes
pnpm check

# Rebuild
pnpm build
```

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review metrics at `/metrics`
3. Check health endpoint
4. Review error messages in structured logs
