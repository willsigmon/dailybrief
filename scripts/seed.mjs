#!/usr/bin/env node

/**
 * Simple seed script - Run with: node scripts/seed.mjs
 * This creates realistic demo data for the HTI Daily BD Intelligence Briefing
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

// Connect to database
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

console.log('🌱 Seeding database with demo data...\n');

try {
  // 1. Create briefing
  console.log('📋 Creating briefing...');
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  
  const briefingResult = await connection.query(
    'INSERT INTO briefings (date, executive_summary) VALUES (?, ?)',
    [today, `Good morning. Today's briefing surfaces 3 high-priority actions requiring immediate follow-up and 2 strategic partnership opportunities with strong consensus from AI analysis. Key focus: Triangle Foundation relationship at risk, NC Digital Opportunity Gathering presents statewide visibility potential.`]
  );
  
  const briefingId = briefingResult[0].insertId;
  console.log('✅ Briefing created:', briefingId);

  // 2. Create urgent alerts
  console.log('\n🚨 Creating urgent alerts...');
  
  const urgentAlerts = [
    {
      type: 'urgent',
      title: 'Follow up with Stephanie Phillips - 24 Hour Window Closing',
      description: 'Email from Stephanie Phillips received 23 hours ago regarding PCs for People partnership expansion. Response window closing - she mentioned being available "this week" for a call.',
      contactName: 'Stephanie Phillips',
      organization: 'PCs for People',
      actionRequired: 'Send immediate reply proposing 2-3 call time options for tomorrow or Monday.',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      type: 'urgent',
      title: 'Kiwanis Club Follow-up - Promised Contact by EOW',
      description: 'During last week\'s Kiwanis breakfast, committed to sending Mark the Q4 workforce development metrics by Friday.',
      contactName: 'Mark Anderson',
      organization: 'Kiwanis Club of Durham',
      actionRequired: 'Compile Q4 metrics: placement rates, employer partnerships, success stories.',
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
    {
      type: 'urgent',
      title: 'Meeting Prep Required - PCs for People Tomorrow',
      description: 'Tomorrow\'s meeting with PCs for People team at 2 PM. Need to research attendees and prepare presentation materials.',
      contactName: 'Stephanie Phillips',
      organization: 'PCs for People',
      actionRequired: 'Research LinkedIn profiles, review annual report, prepare capacity overview.',
      deadline: new Date(Date.now() + 18 * 60 * 60 * 1000),
    },
  ];

  for (const alert of urgentAlerts) {
    await connection.query(
      'INSERT INTO alerts (briefing_id, type, title, description, contact_name, organization, action_required, deadline, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [briefingId, alert.type, alert.title, alert.description, alert.contactName, alert.organization, alert.actionRequired, alert.deadline, false]
    );
  }
  
  console.log('✅ Created 3 urgent alerts');

  // 3. Create important alerts
  console.log('\n⚠️  Creating important alerts...');
  
  const importantAlerts = [
    {
      type: 'important',
      title: 'Triangle Foundation - Relationship Cooling (12 Days)',
      description: 'Last contact with Triangle Foundation was 12 days ago. Previous engagement pattern showed weekly touchpoints.',
      contactName: 'Jennifer Martinez',
      organization: 'Triangle Foundation',
      actionRequired: 'Send friendly check-in email. Suggest coffee chat to discuss partnership expansion.',
    },
    {
      type: 'important',
      title: 'Durham Tech Partnership - Quarterly Check-in Due',
      description: 'Quarterly partnership review with Durham Tech is overdue by 5 days.',
      contactName: 'Sarah Chen',
      organization: 'Durham Technical Community College',
      actionRequired: 'Email Q4 recap and propose 30-min Zoom for next week.',
    },
  ];

  for (const alert of importantAlerts) {
    await connection.query(
      'INSERT INTO alerts (briefing_id, type, title, description, contact_name, organization, action_required, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [briefingId, alert.type, alert.title, alert.description, alert.contactName, alert.organization, alert.actionRequired, false]
    );
  }
  
  console.log('✅ Created 2 important alerts');

  // 4. Create strategic opportunities
  console.log('\n💎 Creating strategic opportunity alerts...');
  
  const strategicAlerts = [
    {
      type: 'strategic',
      title: 'NC Digital Opportunity Gathering - Statewide Visibility',
      description: 'Invitation to present at NC Digital Opportunity Gathering in Raleigh (March 2025). 200+ stakeholders including state legislators and foundation directors.',
      contactName: 'Michael Thompson',
      organization: 'NC Digital Equity Coalition',
      actionRequired: 'Accept speaking invitation. Begin drafting 15-minute presentation.',
    },
    {
      type: 'strategic',
      title: 'IBM SkillsBuild Partnership Expansion',
      description: 'IBM reaching out about expanding SkillsBuild partnership. Looking for 5 HubZone organizations nationally for case study.',
      contactName: 'David Rodriguez',
      organization: 'IBM SkillsBuild',
      actionRequired: 'Schedule exploratory call. Prepare usage metrics and capacity assessment.',
    },
  ];

  for (const alert of strategicAlerts) {
    await connection.query(
      'INSERT INTO alerts (briefing_id, type, title, description, contact_name, organization, action_required, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [briefingId, alert.type, alert.title, alert.description, alert.contactName, alert.organization, alert.actionRequired, false]
    );
  }
  
  console.log('✅ Created 2 strategic opportunity alerts');

  // 5. Create calendar events
  console.log('\n📅 Creating calendar events...');
  
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(14, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(15, 0, 0, 0);

  await connection.query(
    'INSERT INTO calendar_events (briefing_id, title, start_time, end_time, location, description, attendees, strategic_value, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      briefingId,
      'Partnership Meeting - PCs for People Expansion',
      tomorrow,
      tomorrowEnd,
      'Zoom',
      'Deep dive on partnership expansion opportunities.',
      'Stephanie Phillips, Marcus Johnson, Lisa Wang',
      'HIGH PRIORITY: Partnership could 3x device refurbishment volume and provide national visibility.',
      false
    ]
  );

  console.log('✅ Created calendar events');

  // 6. Create relationships
  console.log('\n👥 Creating relationship records...');
  
  const relationships = [
    {
      name: 'Stephanie Phillips',
      org: 'PCs for People',
      lastInteraction: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'email',
      score: 92,
      trend: 'up',
      notes: 'Highly engaged. Recent email shows strong interest in partnership expansion.',
    },
    {
      name: 'Jennifer Martinez',
      org: 'Triangle Foundation',
      lastInteraction: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      type: 'email',
      score: 58,
      trend: 'down',
      notes: 'CONCERN: Relationship cooling. Last contact 12 days ago.',
    },
    {
      name: 'Sarah Chen',
      org: 'Durham Technical Community College',
      lastInteraction: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      type: 'meeting',
      score: 78,
      trend: 'stable',
      notes: 'Solid partnership. Quarterly check-in slightly overdue.',
    },
  ];

  for (const rel of relationships) {
    await connection.query(
      'INSERT INTO relationships (contact_name, organization, last_interaction, last_interaction_type, health_score, trend, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rel.name, rel.org, rel.lastInteraction, rel.type, rel.score, rel.trend, rel.notes]
    );
  }

  console.log('✅ Created 3 relationship records');

  // 7. Create LLM analyses
  console.log('\n🤖 Creating multi-LLM analyses...');
  
  await connection.query(
    `INSERT INTO llm_analyses (briefing_id, topic, claude_analysis, gemini_analysis, grok_analysis, perplexity_analysis, consensus, dissent, recommendation) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      briefingId,
      'NC Digital Opportunity Gathering - Speaking Opportunity',
      'STRONG STRATEGIC FIT: Statewide platform aligns perfectly with HTI mission visibility goals.',
      'CAPACITY CHECK NEEDED: Speaking engagement is strategically sound but requires resource commitment.',
      'HIGH ROI OPPORTUNITY: State-level visibility could unlock multiple funding streams.',
      'BACKGROUND POSITIVE: NC Digital Equity Coalition runs annual gathering, 4th year.',
      'ALL 4 MODELS STRONGLY RECOMMEND: Strategic fit is excellent, ROI potential is high.',
      'Gemini flagged minor capacity concern due to Q1 grant renewal workload.',
      'ACCEPT IMMEDIATELY. Begin prep planning now.',
    ]
  );

  console.log('✅ Created multi-LLM analyses');

  console.log('\n✅ Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log('   - 1 briefing created');
  console.log('   - 3 urgent alerts');
  console.log('   - 2 important alerts');
  console.log('   - 2 strategic opportunity alerts');
  console.log('   - 1 calendar event');
  console.log('   - 3 relationship records');
  console.log('   - 1 multi-LLM analysis');
  console.log('\n🚀 Ready to view in dashboard!\n');

} catch (error) {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
} finally {
  await connection.end();
}
