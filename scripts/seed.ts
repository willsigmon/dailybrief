import * as db from '../server/db';
import { briefings, alerts, calendarEvents, relationships, llmAnalyses } from '../drizzle/schema';

/**
 * Seed script to populate database with realistic demo data
 * Run with: npm run seed
 */

async function seedDatabase() {
  console.log('🌱 Seeding database with demo data...\n');

  try {
    // 1. Create a briefing for today
    console.log('📋 Creating briefing...');
    const today = new Date();
    today.setHours(8, 0, 0, 0);

    const [briefing] = await db.db.insert(briefings).values({
      date: today,
      executiveSummary: `Good morning. Today's briefing surfaces 3 high-priority actions requiring immediate follow-up and 2 strategic partnership opportunities with strong consensus from AI analysis. Key focus: Triangle Foundation relationship at risk, NC Digital Opportunity Gathering presents statewide visibility potential.`,
    }).returning();

    console.log('✅ Briefing created:', briefing.id);

    // 2. Create Urgent Alerts
    console.log('\n🚨 Creating urgent alerts...');
    
    await db.db.insert(alerts).values([
      {
        briefingId: briefing.id,
        type: 'urgent',
        title: 'Follow up with Stephanie Phillips - 24 Hour Window Closing',
        description: 'Email from Stephanie Phillips received 23 hours ago regarding PCs for People partnership expansion. Response window closing - she mentioned being available "this week" for a call. Email expressed strong interest in scaling our digital access programs.',
        contactName: 'Stephanie Phillips',
        organization: 'PCs for People',
        actionRequired: 'Send immediate reply proposing 2-3 call time options for tomorrow or Monday. Include brief recap of our capacity to support 50+ refurbished units monthly.',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        completed: false,
      },
      {
        briefingId: briefing.id,
        type: 'urgent',
        title: 'Kiwanis Club Follow-up - Promised Contact by EOW',
        description: 'During last week\'s Kiwanis breakfast, committed to sending Mark the Q4 workforce development metrics by Friday. He specifically requested placement rates and employer partnership data to present to the board.',
        contactName: 'Mark Anderson',
        organization: 'Kiwanis Club of Durham',
        actionRequired: 'Compile Q4 metrics: placement rates (target: 75%+), number of employer partnerships (currently 12), success stories (2-3 profiles). Send formatted report by EOD Friday.',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48 hours
        completed: false,
      },
      {
        briefingId: briefing.id,
        type: 'urgent',
        title: 'Meeting Prep Required - PCs for People Tomorrow',
        description: 'Tomorrow\'s meeting with PCs for People team at 2 PM. Need to research attendees and prepare presentation materials on current device refurbishment capacity and partnership terms.',
        contactName: 'Stephanie Phillips',
        organization: 'PCs for People',
        actionRequired: 'Research: LinkedIn profiles of 3 attendees, review PCs for People annual report, prepare 1-page capacity overview showing monthly throughput, turnaround times, and success metrics.',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 18), // 18 hours
        completed: false,
      },
    ]);

    console.log('✅ Created 3 urgent alerts');

    // 3. Create Important Alerts
    console.log('\n⚠️  Creating important alerts...');
    
    await db.db.insert(alerts).values([
      {
        briefingId: briefing.id,
        type: 'important',
        title: 'Triangle Foundation - Relationship Cooling (12 Days)',
        description: 'Last contact with Triangle Foundation was 12 days ago. Previous engagement pattern showed weekly touchpoints. Jennifer mentioned in last email she would "circle back next week" about Q1 2025 grant opportunities - no follow-up received.',
        contactName: 'Jennifer Martinez',
        organization: 'Triangle Foundation',
        actionRequired: 'Send friendly check-in email referencing Q1 grant timeline. Mention recent success story (Rodriguez family placement) as proof point. Suggest brief coffee chat to discuss partnership expansion ideas.',
        completed: false,
      },
      {
        briefingId: briefing.id,
        type: 'important',
        title: 'Durham Tech Partnership - Quarterly Check-in Due',
        description: 'Quarterly partnership review with Durham Tech is overdue by 5 days. Sarah usually initiates but may be waiting for our metrics. Last quarter showed 85% completion rate and 12 employer connections.',
        contactName: 'Sarah Chen',
        organization: 'Durham Technical Community College',
        actionRequired: 'Email Sarah with Q4 recap: completion rates, employer partnerships, student success stories. Propose 30-min Zoom for next week to discuss spring semester capacity and new program ideas.',
        completed: false,
      },
    ]);

    console.log('✅ Created 2 important alerts');

    // 4. Create Strategic Opportunity Alerts
    console.log('\n💎 Creating strategic opportunity alerts...');
    
    await db.db.insert(alerts).values([
      {
        briefingId: briefing.id,
        type: 'strategic',
        title: 'NC Digital Opportunity Gathering - Statewide Visibility',
        description: 'Invitation received to present at NC Digital Opportunity Gathering in Raleigh (March 2025). Event draws 200+ stakeholders including state legislators, foundation directors, and tech company executives. Speaking slot available on "Rural Digital Access Innovations" panel.',
        contactName: 'Michael Thompson',
        organization: 'NC Digital Equity Coalition',
        actionRequired: 'Accept speaking invitation. Begin drafting 15-minute presentation highlighting HTI\'s rural HubZone model, partnership approach, and measurable outcomes. Potential to secure 3-5 new regional partnerships and state-level visibility.',
        completed: false,
      },
      {
        briefingId: briefing.id,
        type: 'strategic',
        title: 'IBM SkillsBuild Partnership Expansion',
        description: 'IBM reaching out through LinkedIn about expanding SkillsBuild partnership beyond current pilot. They\'re looking for 5 HubZone organizations nationally to feature in case study and scale training offerings. Mentioned potential for donated equipment and priority access to enterprise certifications.',
        contactName: 'David Rodriguez',
        organization: 'IBM SkillsBuild',
        actionRequired: 'Schedule exploratory call with IBM team. Prepare: current SkillsBuild usage metrics, expansion capacity (can we handle 100+ annual participants?), equipment needs list, certification preferences. High potential for national visibility and resource access.',
        completed: false,
      },
    ]);

    console.log('✅ Created 2 strategic opportunity alerts');

    // 5. Create Calendar Events
    console.log('\n📅 Creating calendar events...');
    
    const tomorrow = new Date(Date.now() + 1000 * 60 * 60 * 24);
    tomorrow.setHours(14, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(15, 0, 0, 0);

    const monday = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    monday.setHours(10, 0, 0, 0);
    const mondayEnd = new Date(monday);
    mondayEnd.setHours(11, 0, 0, 0);

    const wednesday = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5);
    wednesday.setHours(15, 30, 0, 0);
    const wednesdayEnd = new Date(wednesday);
    wednesdayEnd.setHours(16, 30, 0, 0);

    await db.db.insert(calendarEvents).values([
      {
        briefingId: briefing.id,
        title: 'Partnership Meeting - PCs for People Expansion',
        startTime: tomorrow,
        endTime: tomorrowEnd,
        location: 'Zoom (link in calendar invite)',
        description: 'Deep dive on partnership expansion opportunities. Agenda: current capacity review, scaling roadmap, equipment pipeline, success metrics presentation.',
        attendees: 'Stephanie Phillips (Executive Director), Marcus Johnson (Operations), Lisa Wang (Partnerships)',
        strategicValue: 'HIGH PRIORITY: PCs for People processes 10,000+ devices annually and serves 40 states. Partnership could 3x our device refurbishment volume and provide national visibility. They specifically mentioned featuring HTI in upcoming annual report reaching 500+ donors and partners.',
        completed: false,
      },
      {
        briefingId: briefing.id,
        title: 'Monthly Coffee - Durham Chamber Leadership',
        startTime: monday,
        endTime: mondayEnd,
        location: 'Guglhupf Cafe, Durham',
        description: 'Regular monthly touchpoint with Chamber leadership. Casual relationship maintenance and community pulse check.',
        attendees: 'Tom Bradley (Chamber President)',
        strategicValue: 'RELATIONSHIP MAINTENANCE: Tom is key connector to Durham business community. He introduced us to 3 employer partners last year. Keep relationship warm, share recent wins, ask about upcoming chamber initiatives where HTI could participate.',
        completed: false,
      },
      {
        briefingId: briefing.id,
        title: 'Quarterly Review - Triangle Foundation',
        startTime: wednesday,
        endTime: wednesdayEnd,
        location: 'Triangle Foundation Office, Chapel Hill',
        description: 'Q4 2024 grant performance review and Q1 2025 planning discussion.',
        attendees: 'Jennifer Martinez (Program Officer), David Kim (Grants Director)',
        strategicValue: 'FUNDING CRITICAL: Current grant ($50K) expires Dec 31. This meeting determines renewal and potential expansion to $75K for 2025. Bring: completion metrics (target 90%+), success stories (minimum 3 compelling profiles), Q1 expansion proposal with clear ROI.',
        completed: false,
      },
    ]);

    console.log('✅ Created 3 calendar events');

    // 6. Create Relationships
    console.log('\n👥 Creating relationship records...');
    
    const twoWeeksAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);
    const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const lastWeek = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const twoDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);

    await db.db.insert(relationships).values([
      {
        contactName: 'Stephanie Phillips',
        organization: 'PCs for People',
        lastInteraction: yesterday,
        lastInteractionType: 'email',
        healthScore: 92,
        trend: 'up',
        notes: 'Highly engaged. Recent email shows strong interest in partnership expansion. Meeting scheduled for tomorrow. Relationship momentum is excellent.',
      },
      {
        contactName: 'Jennifer Martinez',
        organization: 'Triangle Foundation',
        lastInteraction: twoWeeksAgo,
        lastInteractionType: 'email',
        healthScore: 58,
        trend: 'down',
        notes: 'CONCERN: Relationship cooling. Last contact 12 days ago. Previous pattern was weekly touchpoints. She mentioned following up "next week" but hasn\'t. May be overwhelmed with year-end grant reviews. Needs immediate warm outreach.',
      },
      {
        contactName: 'Sarah Chen',
        organization: 'Durham Technical Community College',
        lastInteraction: lastWeek,
        lastInteractionType: 'meeting',
        healthScore: 78,
        trend: 'stable',
        notes: 'Solid partnership. Quarterly check-in slightly overdue but relationship is strong. Last meeting discussed spring semester capacity - she was enthusiastic about expanding student placements.',
      },
      {
        contactName: 'Mark Anderson',
        organization: 'Kiwanis Club of Durham',
        lastInteraction: lastWeek,
        lastInteractionType: 'meeting',
        healthScore: 72,
        trend: 'stable',
        notes: 'Community connector. Made commitment at last Kiwanis breakfast to provide Q4 metrics. He\'s presenting HTI to board next month - critical to deliver on promise to maintain credibility.',
      },
      {
        contactName: 'David Rodriguez',
        organization: 'IBM SkillsBuild',
        lastInteraction: twoDaysAgo,
        lastInteractionType: 'email',
        healthScore: 85,
        trend: 'new',
        notes: 'NEW OPPORTUNITY: Reached out via LinkedIn about national partnership expansion. IBM looking for 5 HubZone organizations for case study. Potential for equipment donations and enterprise certifications. High strategic value.',
      },
    ]);

    console.log('✅ Created 5 relationship records');

    // 7. Create Multi-LLM Analyses
    console.log('\n🤖 Creating multi-LLM analyses...');
    
    await db.db.insert(llmAnalyses).values([
      {
        briefingId: briefing.id,
        topic: 'NC Digital Opportunity Gathering - Speaking Opportunity',
        claudeAnalysis: 'STRONG STRATEGIC FIT: Statewide platform aligns perfectly with HTI mission visibility goals. 200+ stakeholders including legislators and foundation directors = high-value audience. "Rural Digital Access" panel is ideal positioning. Risk: 4-month prep timeline requires immediate commitment. Recommendation: Accept immediately, allocate 10-15 hours prep time.',
        geminiAnalysis: 'CAPACITY CHECK NEEDED: Speaking engagement is strategically sound but requires resource commitment during Q1 2025 (typically busy with grant renewals). Prep time: ~15 hours (research, slides, practice). Travel: 1 day to Raleigh. ROI potential is high (3-5 new partnerships) but confirm team bandwidth. Minor capacity risk, manageable with early planning.',
        grokAnalysis: 'HIGH ROI OPPORTUNITY: State-level visibility could unlock multiple funding streams. Similar events historically generate 5-10 qualified partnership leads. Foundation directors in audience = direct grant decision-maker access. Network expansion potential: 8/10. Platform credibility boost = invaluable for future proposals. Financial ROI estimate: $150K+ in new partnerships within 12 months.',
        perplexityAnalysis: 'BACKGROUND POSITIVE: NC Digital Equity Coalition runs annual gathering, 4th year. Previous speakers include Microsoft, NC Dept of IT, rural broadband leaders. Event well-regarded in state digital inclusion community. No red flags on organizer. Panel format means shared spotlight (4 speakers) = less pressure. Past attendees report strong networking value. Recommendation: Participate.',
        consensus: 'ALL 4 MODELS STRONGLY RECOMMEND: Strategic fit is excellent, ROI potential is high, risks are minimal and manageable. Only concern is Q1 capacity, but prep can begin immediately to spread workload.',
        dissent: 'Gemini flagged minor capacity concern due to Q1 grant renewal workload. Mitigation: Start prep in December, spread across 6 weeks instead of cramming.',
        recommendation: 'ACCEPT IMMEDIATELY. Begin prep planning now: (1) Confirm speaking slot within 48 hours, (2) Block 2 hours weekly Dec-Feb for preparation, (3) Draft presentation outline by end of month. High strategic value with manageable time investment.',
      },
      {
        briefingId: briefing.id,
        topic: 'IBM SkillsBuild Partnership Expansion',
        claudeAnalysis: 'RELATIONSHIP-FIRST APPROACH: IBM reaching out = strong signal of HTI reputation. LinkedIn contact suggests informal vetting already occurred. "Feature in case study" = national visibility. Priority: Understand their selection criteria and timeline. Risk: Scaling to 100+ participants may strain current infrastructure. Recommendation: Enthusiastic interest + capacity reality check.',
        geminiAnalysis: 'SCALE RISK MODERATE: Current SkillsBuild pilot serves 25 participants. 4x increase to 100+ requires: (1) Additional mentors/trainers (2) Expanded lab space or equipment (3) Enhanced tracking systems. However, IBM equipment donations could offset infrastructure costs. Key question: What support does IBM provide beyond curriculum? Recommendation: Explore with detailed capacity questions.',
        grokAnalysis: 'NATIONAL VISIBILITY JACKPOT: IBM case study reaches enterprise audience nationwide. Enterprise certifications = premium value proposition for participants. Equipment donations could solve major pain point (aging refurbished machines). Network effect: IBM brand association elevates HTI credibility with other corporate partners. Estimated PR value: $50K+. Financial value of donated equipment: $30-60K. ROI: Excellent.',
        perplexityAnalysis: 'IBM SKILLSBUILD VERIFICATION: Program launched 2020, serves 30M+ users globally. Corporate partners include Coursera, United Way, Goodwill. HubZone focus = newer initiative (2023). "5 organizations nationally" suggests selective cohort = high visibility. Equipment donations historically include laptops, monitors, networking gear. Enterprise certifications include cloud, data analytics, cybersecurity. Program has strong industry reputation. No concerns identified.',
        consensus: 'ALL 4 MODELS RECOMMEND PURSUING: Strategic value is exceptional, visibility potential is national-scale, risks are manageable with proper planning. Capacity concerns exist but IBM support + equipment donations should offset.',
        dissent: 'Gemini expressed moderate concern about scaling capacity 4x. Claude and Gemini both recommend thorough capacity assessment before committing. Not a "no" but a "proceed carefully with clear capacity questions."',
        recommendation: 'PURSUE AGGRESSIVELY: Schedule call within 1 week. Prepare questions: (1) Selection criteria and timeline, (2) What equipment/support IBM provides, (3) Participant ramp-up schedule (can we grow gradually to 100?), (4) Case study scope and approval process. This is rare national-visibility opportunity - worth significant effort to make work.',
      },
    ]);

    console.log('✅ Created 2 multi-LLM analyses');

    console.log('\n✅ Database seeding complete!');
    console.log('\n📊 Summary:');
    console.log('   - 1 briefing created');
    console.log('   - 3 urgent alerts');
    console.log('   - 2 important alerts');
    console.log('   - 2 strategic opportunity alerts');
    console.log('   - 3 calendar events');
    console.log('   - 5 relationship records');
    console.log('   - 2 multi-LLM analyses');
    console.log('\n🚀 Ready to view in dashboard!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('✅ Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
