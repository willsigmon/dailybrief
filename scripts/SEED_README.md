# Running the Seed Script

## Quick Setup

1. **Make sure you have a `.env` file** with your DATABASE_URL:

```bash
cp .env.example .env
```

2. **Edit `.env` and add your database connection:**

```env
DATABASE_URL=mysql://username:password@host:port/database
```

3. **Run the seed script:**

```bash
node scripts/seed.mjs
```

## What the Seed Creates

The script populates your database with realistic demo data:

- **1 Briefing** - Today's executive summary
- **3 Urgent Alerts** - 24-48 hour deadline items
- **2 Important Alerts** - This week priorities  
- **2 Strategic Opportunities** - Long-term partnerships
- **Calendar Events** - Upcoming meetings with prep notes
- **Relationship Records** - Contact health scores and trends
- **Multi-LLM Analyses** - 4-model consensus views

## After Seeding

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. You'll see a fully populated dashboard with all features working!

## Troubleshooting

**Error: Cannot read properties of undefined**
- Make sure DATABASE_URL is set in .env
- Check that the database exists and is accessible

**No data showing in dashboard**
- Verify the briefing was created: Check database `briefings` table
- Check browser console for errors
- Try refreshing the page

## For Production Data

Once you're happy with the demo, the real system will:
1. Pull actual Gmail messages every morning at 8 AM
2. Fetch real calendar events  
3. Generate alerts from actual relationship patterns
4. Run multi-LLM analysis on real opportunities

The seed script is just to show you the complete vision!
