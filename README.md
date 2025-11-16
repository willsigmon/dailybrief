# HTI Daily BD Intelligence Briefing

An AI-powered business development intelligence dashboard with a beautiful, modern interface that automatically generates daily briefings with multi-LLM analysis, smart alerts, and relationship tracking.

## ✨ Status: 100% COMPLETE & PRODUCTION READY

### 🚀 Quick Start (One Command!)

```bash
npm run setup  # Checks environment, initializes database, seeds demo data
npm run dev    # Start development server
```

## ✨ Design Features

- **Glassmorphism UI** - Modern frosted glass effects throughout
- **Rich Gradients** - Beautiful color gradients for visual hierarchy  
- **Smooth Animations** - Delightful micro-interactions and transitions
- **Responsive Design** - Perfect on desktop, tablet, and mobile
- **Animated Backgrounds** - Organic blob animations for a living interface

## 🚀 Features

### Smart Alerts
- **Response Urgency Detection** - Identifies emails requiring immediate follow-up
- **Relationship Cooling Alerts** - Detects when contacts haven't been engaged recently
- **Meeting Preparation** - Surfaces context and talking points for upcoming meetings
- **Commitment Tracking** - Monitors promises made and deadlines approaching

### Multi-LLM Consensus Analysis
- Runs strategic opportunities through **4 AI models** (Claude, Gemini, Grok, Perplexity)
- Aggregates consensus and dissenting opinions
- Provides confidence-weighted recommendations
- Surfaces edge cases and risks each model identifies

### Relationship Intelligence
- Tracks engagement momentum with contacts
- Calculates relationship health scores
- Identifies hidden connections between contacts
- Monitors conversation frequency and response times

### Automated Daily Briefings
- Scheduled generation every weekday at 8 AM EST
- Pulls data from Gmail, Google Calendar, and Limitless recordings
- Real-time progress tracking with Server-Sent Events
- Graceful degradation if data sources are unavailable

### Interactive Dashboard
- Executive summary with top priorities
- Collapsible sections for urgent/important/strategic items
- Calendar integration with strategic value assessment
- Mark items as complete with checkbox functionality
- Responsive design for mobile and desktop

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: Manus OAuth
- **Integrations**: Gmail MCP, Google Calendar MCP, Limitless MCP
- **AI**: Claude Sonnet 4.5, Gemini 2.5 Pro, Grok 4, Perplexity Sonar Pro

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/willsigmon/hti-daily-briefing.git
cd hti-daily-briefing

# Install dependencies
pnpm install

# Set up environment variables (see Configuration section)

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

## 🔧 Configuration

### Required Environment Variables
- `DATABASE_URL` - MySQL/TiDB connection string
- `JWT_SECRET` - Session cookie signing secret
- `ANTHROPIC_API_KEY` - Claude API key
- `GEMINI_API_KEY` - Google Gemini API key
- `XAI_API_KEY` - Grok API key
- `SONAR_API_KEY` - Perplexity API key

### MCP Integrations
Configure the following MCP servers in your Manus environment:
- **Gmail** - For email analysis and smart alerts
- **Google Calendar** - For meeting preparation and calendar integration
- **Limitless** - For conversational insights from recordings

### Scheduled Briefings
The system automatically generates briefings at 8 AM EST on weekdays. Modify the schedule in `server/_core/index.ts`:

```typescript
// Current: 8 AM EST, Monday-Friday
cron.schedule('0 0 8 * * 1-5', async () => {
  await generateDailyBriefing();
}, { timezone: 'America/New_York' });
```

## 📖 Usage

### Manual Briefing Generation
Click the "Generate Briefing" button in the dashboard header to create a briefing on-demand.

### Viewing Briefings
The dashboard displays the most recent briefing automatically. Navigate through sections:
- **Executive Summary** - High-level overview of priorities
- **Urgent Actions** - Time-sensitive items requiring immediate attention
- **Important Actions** - Key tasks for the week
- **Strategic Opportunities** - Long-term relationship building and partnerships
- **Calendar Prep** - Upcoming meetings with context and talking points
- **Relationship Intelligence** - Contact engagement tracking

### Marking Items Complete
Check the box next to any alert or calendar event to mark it as complete.

## 🏗️ Architecture

### Data Flow
1. **Data Ingestion** - MCP integrations fetch Gmail, Calendar, Limitless data
2. **Alert Generation** - Smart alerts analyze data for urgency, relationships, commitments
3. **LLM Analysis** - Strategic opportunities run through 4 AI models for consensus
4. **Relationship Scoring** - Calculate health scores based on engagement patterns
5. **Executive Summary** - LLM generates high-level overview
6. **Database Storage** - All briefing data persisted for historical tracking

### Database Schema
- `briefings` - Daily briefing records with executive summaries
- `alerts` - Smart alerts (urgent/important/strategic)
- `calendar_events` - Upcoming meetings with strategic value
- `relationships` - Contact tracking with health scores
- `llm_analyses` - Multi-LLM consensus analysis results

## 🔐 Security

- OAuth authentication via Manus
- Role-based access control (admin/user)
- API keys stored in environment variables
- Session cookies with HTTP-only flag
- Database credentials never exposed to frontend

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

Will Sigmon - wsigmon@hubzonetech.org
