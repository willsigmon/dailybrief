# Running Without Manus - Standalone Setup Guide

This guide shows how to run the HTI Daily Briefing app **without** Manus hosting or dependencies.

## ✅ What Works Without Manus

- ✅ **Core Application** - Dashboard, UI, database
- ✅ **LLM Analysis** - All 4 LLMs (Claude, Gemini, Grok, Perplexity) via direct APIs
- ✅ **Authentication** - Can use mock auth or integrate your own OAuth provider
- ✅ **Scheduled Briefings** - Cron jobs work independently

## ⚠️ What Needs Alternatives

- ⚠️ **MCP Integrations** - Need to replace `manus-mcp-cli` with direct API calls
- ⚠️ **OAuth** - Need to configure your own OAuth provider or use mock auth
- ⚠️ **Vite Plugin** - Optional, can be removed

---

## Step 1: Remove/Replace Manus-Specific Dependencies

### Option A: Make Vite Plugin Optional

The `vite-plugin-manus-runtime` is only needed for Manus runtime environment injection. You can make it optional:

```typescript
// vite.config.ts
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  // Only include if Manus runtime is available
  ...(process.env.MANUS_RUNTIME ? [vitePluginManusRuntime()] : [])
];
```

### Option B: Remove Completely

If you don't need Manus runtime features, you can remove it entirely from `package.json` and `vite.config.ts`.

---

## Step 2: Replace MCP Integration with Direct APIs

The current MCP integration uses `manus-mcp-cli`. Here are alternatives:

### Gmail Integration

**Option 1: Google Gmail API (Recommended)**

```typescript
// server/services/mcpIntegration.ts
import { google } from 'googleapis';

export async function fetchGmailMessages(daysBack: number = 2): Promise<GmailMessage[]> {
  // If using direct Gmail API
  if (process.env.GMAIL_ACCESS_TOKEN) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: process.env.GMAIL_ACCESS_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${Math.floor(afterDate.getTime() / 1000)}`,
      maxResults: 50,
    });

    // Process messages...
    return messages;
  }

  // Fallback to MCP CLI if available
  return fetchGmailMessagesViaMCP(daysBack);
}
```

**Option 2: IMAP/POP3**

Use libraries like `imap` or `node-imap` to connect directly to Gmail.

### Google Calendar Integration

**Direct Google Calendar API:**

```typescript
import { google } from 'googleapis';

export async function fetchCalendarEvents(daysAhead: number = 7): Promise<CalendarEvent[]> {
  if (process.env.GOOGLE_CALENDAR_ACCESS_TOKEN) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: process.env.GOOGLE_CALENDAR_ACCESS_TOKEN });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      maxResults: 50,
    });

    return response.data.items?.map(item => ({
      id: item.id!,
      title: item.summary || '',
      // ... map other fields
    })) || [];
  }

  // Fallback to MCP CLI
  return fetchCalendarEventsViaMCP(daysAhead);
}
```

### Limitless Integration

Limitless doesn't have a public API, so you'll need to:
1. Use their API if available
2. Skip this integration
3. Use alternative call recording services

---

## Step 3: Configure Alternative OAuth

### Option A: Use Mock Auth (Development)

Already configured! The app uses mock authentication when `OAUTH_SERVER_URL` is not set.

### Option B: Integrate Your Own OAuth Provider

**Example: Google OAuth**

```typescript
// server/_core/oauth.ts (new implementation)
import { google } from 'googleapis';

export function registerOAuthRoutes(app: Express) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/oauth/callback`
  );

  app.get('/api/oauth/login', (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.readonly'];
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes });
    res.redirect(url);
  });

  app.get('/api/oauth/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Create session and redirect...
  });
}
```

**Example: Auth0**

```typescript
import { auth0 } from 'auth0';

// Similar pattern with Auth0 SDK
```

---

## Step 4: Configure LLM APIs

The app already supports custom LLM endpoints! Just set:

```bash
# Use OpenAI-compatible API instead of Manus Forge
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
BUILT_IN_FORGE_API_KEY=sk-your-openai-key

# Or use Anthropic directly
BUILT_IN_FORGE_API_URL=https://api.anthropic.com/v1
BUILT_IN_FORGE_API_KEY=sk-ant-your-key
```

---

## Step 5: Environment Variables

Create a `.env` file:

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/dailybrief

# Authentication (optional - uses mock if not set)
JWT_SECRET=your-random-secret-key
OAUTH_SERVER_URL=  # Leave empty for mock auth

# LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
XAI_API_KEY=...
SONAR_API_KEY=...

# Use custom LLM endpoint (optional)
BUILT_IN_FORGE_API_URL=https://api.openai.com/v1
BUILT_IN_FORGE_API_KEY=sk-...

# Google APIs (if replacing MCP)
GMAIL_ACCESS_TOKEN=...
GOOGLE_CALENDAR_ACCESS_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# App Configuration
VITE_APP_TITLE=HTI Daily Briefing
VITE_APP_LOGO=/favicon.ico
```

---

## Step 6: Install Additional Dependencies (if using direct APIs)

```bash
npm install googleapis
# or
npm install imap
# or
npm install @auth0/nextjs-auth0  # for Auth0
```

---

## Summary: What to Change

1. ✅ **Vite Plugin** - Make optional or remove
2. ✅ **MCP Integration** - Replace `manus-mcp-cli` calls with direct API calls
3. ✅ **OAuth** - Already optional (uses mock), or integrate your provider
4. ✅ **LLM API** - Already configurable via `BUILT_IN_FORGE_API_URL`

---

## Testing Without Manus

1. Set `OAUTH_SERVER_URL` to empty (uses mock auth)
2. Don't set MCP-related env vars (app gracefully degrades)
3. Configure LLM API keys
4. Run `npm run dev`

The app will work with:
- ✅ Mock authentication
- ✅ Empty data sources (shows welcome screen)
- ✅ LLM analysis (if API keys configured)
- ✅ All UI features

---

## Next Steps

1. Implement direct Gmail/Calendar API integration
2. Add your preferred OAuth provider
3. Remove `vite-plugin-manus-runtime` if not needed
4. Update MCP integration to use direct APIs

The core application architecture is **completely independent** of Manus - it's just the integrations that need alternatives!
