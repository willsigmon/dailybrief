# Setup Guide - Daily Intelligence Briefing

## Quick Start

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - MySQL/TiDB connection string
- `JWT_SECRET` - Random string for session signing
- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com
- `GEMINI_API_KEY` - Get from https://aistudio.google.com/app/apikey
- `XAI_API_KEY` - Get from https://x.ai
- `SONAR_API_KEY` - Get from https://www.perplexity.ai

### 3. Setup Database

```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Running in Manus.im

This app is designed to run in Manus.im and leverage its MCP integrations:

1. **Gmail MCP** - For email analysis and smart alerts
2. **Google Calendar MCP** - For meeting preparation
3. **Limitless MCP** - For conversational insights

### Manus Configuration

Make sure your Manus environment has these MCP servers configured:
- Gmail
- Google Calendar  
- Limitless

The app will automatically detect and use these integrations when available.

## Production Deployment

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

## Features

- 🚨 **Smart Alerts** - Response urgency, relationship cooling, commitment tracking
- 🤖 **Multi-LLM Analysis** - Claude, Gemini, Grok, Perplexity consensus
- 👥 **Relationship Intelligence** - Health scores and engagement tracking
- 📅 **Calendar Prep** - Meeting context and talking points
- ⏰ **Automated Briefings** - Daily generation at 8 AM EST

## Troubleshooting

### Database Connection Issues

Make sure your DATABASE_URL is correctly formatted:
```
mysql://username:password@host:port/database
```

### Build Errors

If you encounter peer dependency errors, use:
```bash
npm install --legacy-peer-deps
```

### MCP Integration Not Working

Verify that:
1. You're running in Manus.im environment
2. MCP servers are properly configured
3. You have necessary permissions for Gmail/Calendar access

## Support

For issues or questions, contact: wsigmon@hubzonetech.org
